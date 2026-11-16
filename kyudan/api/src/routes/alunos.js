// Alunos (RF-02), aptidao (RF-04), exame (RF-05), trilha (RF-06),
// arvore de habilidades (RF-14) e validacao pelo professor (RF-15).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q, one, audit, pool } from '../db.js';
import { HttpError, permitir, rota, ehGlobal, academiaDoPedido, exigirMesmaAcademia, EQUIPE } from '../auth.js';
import { calcularAptidao, faixasDaModalidade } from '../rules/aptidao.js';

const r = Router();
const SELECT = `SELECT s.*, b.name AS belt_name, b.color AS belt_color, a.name AS academy_name
                  FROM students s LEFT JOIN belts b ON b.id = s.belt_id
                  JOIN academies a ON a.id = s.academy_id`;

// Carrega o aluno respeitando o perfil: equipe ve a propria academia,
// aluno ve apenas a propria ficha.
async function carregar(req) {
  const s = await one(`${SELECT} WHERE s.id = $1`, [req.params.id]);
  if (!s) throw new HttpError(404, 'Aluno não encontrado.');
  if (req.user.role === 'aluno') {
    if (s.user_id !== req.user.id) throw new HttpError(404, 'Aluno não encontrado.');
  } else {
    exigirMesmaAcademia(req.user, s.academy_id);
  }
  return s;
}

r.get('/', permitir(...EQUIPE), rota(async (req, res) => {
  const academia = academiaDoPedido(req);
  res.json(await q(`${SELECT} WHERE ($1::uuid IS NULL OR s.academy_id = $1) ORDER BY s.name`, [academia]));
}));

// Ficha do aluno logado (perfil aluno).
r.get('/eu', rota(async (req, res) => {
  const s = await one(`${SELECT} WHERE s.user_id = $1`, [req.user.id]);
  if (!s) throw new HttpError(404, 'Não há ficha de aluno vinculada a este usuário.');
  res.json(s);
}));

r.post('/', permitir('superadmin', 'admin', 'gestor', 'mestre'), rota(async (req, res) => {
  const b = req.body || {};
  const academia = academiaDoPedido(req, { obrigatoria: true });
  if (!b.name) throw new HttpError(400, 'Informe o nome do aluno.');
  const modalidade = b.modality_id || 'judo';
  const faixas = await faixasDaModalidade(academia, modalidade);
  if (!faixas.length) throw new HttpError(400, `Modalidade "${modalidade}" sem faixas configuradas.`);
  const faixa = faixas.find((f) => f.id === b.belt_id) || faixas[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let userId = null;
    if (b.email && b.password) { // acesso do aluno e opcional
      if (b.password.length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres.');
      const dup = await client.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [b.email]);
      if (dup.rowCount) throw new HttpError(409, 'Já existe um usuário com este e-mail.');
      const u = await client.query(
        `INSERT INTO users (name, email, password_hash, role, academy_id, phone) VALUES ($1,$2,$3,'aluno',$4,$5) RETURNING id`,
        [b.name, b.email, await bcrypt.hash(b.password, 10), academia, b.phone || null],
      );
      userId = u.rows[0].id;
    }
    const s = await client.query(
      `INSERT INTO students (academy_id, user_id, name, birth_date, phone, modality_id, belt_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [academia, userId, b.name, b.birth_date || null, b.phone || null, modalidade, faixa.id, b.notes || null],
    );
    if (b.class_id) {
      const turma = await client.query('SELECT 1 FROM classes WHERE id = $1 AND academy_id = $2', [b.class_id, academia]);
      if (!turma.rowCount) throw new HttpError(400, 'Turma inválida para esta academia.');
      await client.query('INSERT INTO class_enrollments (class_id, student_id) VALUES ($1,$2)', [b.class_id, s.rows[0].id]);
    }
    await client.query('COMMIT');
    await audit(req.user, 'aluno.criado', b.name);
    res.status(201).json(s.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

r.get('/:id', rota(async (req, res) => {
  const s = await carregar(req);
  res.json({ ...s, aptidao: await calcularAptidao(s) });
}));

// Trilha de graduacao: todas as faixas, com a situacao de cada uma.
r.get('/:id/trilha', rota(async (req, res) => {
  const s = await carregar(req);
  const faixas = await faixasDaModalidade(s.academy_id, s.modality_id);
  const historico = await q(
    `SELECT g.*, tb.name AS to_belt_name, u.name AS examiner_name FROM graduations g
       JOIN belts tb ON tb.id = g.to_belt_id LEFT JOIN users u ON u.id = g.examiner_id
      WHERE g.student_id = $1 ORDER BY g.exam_date, g.created_at`,
    [s.id],
  );
  const ordemAtual = faixas.find((f) => f.id === s.belt_id)?.sort_order ?? 0;
  res.json({
    aluno: { id: s.id, name: s.name, modality_id: s.modality_id },
    faixas: faixas.map((f) => ({
      id: f.id, name: f.name, color: f.color, required_classes: f.required_classes,
      situacao: f.sort_order < ordemAtual ? 'concluida' : f.sort_order === ordemAtual ? 'atual' : 'futura',
    })),
    aptidao: await calcularAptidao(s),
    historico,
  });
}));

r.get('/:id/habilidades', rota(async (req, res) => {
  const s = await carregar(req);
  res.json(await q(
    `SELECT t.id, t.name, t.category, t.description, b.name AS belt_name, b.sort_order,
            COALESCE(sp.status, 'bloqueada') AS status, sp.validated_at, sp.professor_note
       FROM techniques t LEFT JOIN belts b ON b.id = t.required_for_belt_id
       LEFT JOIN skill_progress sp ON sp.technique_id = t.id AND sp.student_id = $1
      WHERE t.modality_id = $2 ORDER BY b.sort_order NULLS LAST, t.category, t.name`,
    [s.id, s.modality_id],
  ));
}));

r.put('/:id/habilidades/:tecnicaId', permitir('superadmin', 'admin', 'mestre', 'autonomo'), rota(async (req, res) => {
  const s = await carregar(req);
  const { status, professor_note } = req.body || {};
  if (!['bloqueada', 'apresentada', 'em-treino', 'validada'].includes(status)) throw new HttpError(400, 'Status inválido.');
  const t = await one('SELECT id FROM techniques WHERE id = $1 AND modality_id = $2', [req.params.tecnicaId, s.modality_id]);
  if (!t) throw new HttpError(404, 'Técnica não encontrada para esta modalidade.');
  const validada = status === 'validada';
  res.json(await one(
    `INSERT INTO skill_progress (student_id, technique_id, status, validated_by, validated_at, professor_note)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (student_id, technique_id) DO UPDATE
       SET status = EXCLUDED.status, validated_by = EXCLUDED.validated_by,
           validated_at = EXCLUDED.validated_at, professor_note = EXCLUDED.professor_note, updated_at = now()
     RETURNING *`,
    [s.id, t.id, status, validada ? req.user.id : null, validada ? new Date().toISOString().slice(0, 10) : null, professor_note || null],
  ));
}));

// Lancamento de exame. A aptidao e registrada como retrato do momento,
// mas nao impede o lancamento: a decisao e do mestre.
r.post('/:id/graduacoes', permitir('superadmin', 'admin', 'mestre', 'autonomo'), rota(async (req, res) => {
  const s = await carregar(req);
  const { result, notes, exam_date } = req.body || {};
  if (!['aprovado', 'reprovado'].includes(result)) throw new HttpError(400, 'Informe o resultado: aprovado ou reprovado.');
  const apt = await calcularAptidao(s);
  if (!apt.proxima_faixa) throw new HttpError(400, 'O aluno já está na última faixa da modalidade.');
  const g = await one(
    `INSERT INTO graduations (student_id, from_belt_id, to_belt_id, exam_date, result, classes_attended, classes_required, examiner_id, notes)
     VALUES ($1,$2,$3,COALESCE($4::date, CURRENT_DATE),$5,$6,$7,$8,$9) RETURNING *`,
    [s.id, s.belt_id, apt.proxima_faixa.id, exam_date || null, result, apt.presencas, apt.presencas_exigidas, req.user.id, notes || null],
  );
  if (result === 'aprovado') await q('UPDATE students SET belt_id = $1, updated_at = now() WHERE id = $2', [apt.proxima_faixa.id, s.id]);
  await audit(req.user, 'exame.lancado', s.name, { result, faixa: apt.proxima_faixa.name });
  res.status(201).json(g);
}));

export default r;
