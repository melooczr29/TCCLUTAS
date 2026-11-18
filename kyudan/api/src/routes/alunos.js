// Alunos (RF-02), inscricoes por modalidade (RF-20), aptidao (RF-04),
// exame (RF-05), trilha (RF-06), arvore de habilidades (RF-14) e
// validacao tecnica (RF-15).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q, one, audit, pool } from '../db.js';
import {
  HttpError, permitir, rota, ehGlobal, ehProfessor, academiaDoPedido, alunoVisivel, EQUIPE,
} from '../auth.js';
import { calcularAptidao, faixasDaModalidade, idadeEm, hoje } from '../rules/aptidao.js';

const r = Router();
const GESTAO = ['superadmin', 'admin', 'gestor'];
const PROFESSOR = ['superadmin', 'admin', 'mestre', 'autonomo'];

const INSCRICOES = `
  SELECT e.*, m.name AS modality_name, b.name AS belt_name, b.color AS belt_color
    FROM enrollments e JOIN modalities m ON m.id = e.modality_id JOIN belts b ON b.id = e.belt_id`;

async function carregar(req) {
  const s = await one(
    'SELECT s.*, a.name AS academy_name FROM students s JOIN academies a ON a.id = s.academy_id WHERE s.id = $1',
    [req.params.id],
  );
  if (!s || !(await alunoVisivel(req.user, s))) throw new HttpError(404, 'Aluno não encontrado.');
  return s;
}

// Inscricao da modalidade pedida (?modalidade= ou body.modality_id) ou a primeira.
async function inscricao(student, modalidade) {
  const lista = await q(`${INSCRICOES} WHERE e.student_id = $1 ORDER BY e.created_at`, [student.id]);
  if (!lista.length) throw new HttpError(404, 'O aluno não está inscrito em nenhuma modalidade.');
  if (!modalidade) return lista[0];
  const e = lista.find((x) => x.modality_id === modalidade);
  if (!e) throw new HttpError(404, 'O aluno não está inscrito nessa modalidade.');
  return e;
}

// Cria a inscricao na faixa inicial ou, havendo graduacao externa, na faixa
// e data informadas (RF-20, fluxo alternativo).
async function criarInscricao(db, student, { modality_id, belt_id, belt_since }) {
  const faixas = await faixasDaModalidade(student.academy_id, modality_id);
  if (!faixas.length) throw new HttpError(400, `Modalidade "${modality_id}" sem faixas configuradas.`);
  const faixa = belt_id ? faixas.find((f) => f.id === belt_id) : faixas[0];
  if (!faixa) throw new HttpError(400, 'Faixa inválida para a modalidade.');
  if (belt_since && belt_since > hoje()) throw new HttpError(400, 'A data da última graduação não pode ser futura.');
  const dup = await db.query('SELECT 1 FROM enrollments WHERE student_id = $1 AND modality_id = $2', [student.id, modality_id]);
  if (dup.rowCount) throw new HttpError(409, 'O aluno já está inscrito nessa modalidade.');
  const e = await db.query(
    `INSERT INTO enrollments (student_id, modality_id, belt_id, belt_since)
     VALUES ($1,$2,$3,COALESCE($4::date, CURRENT_DATE)) RETURNING *`,
    [student.id, modality_id, faixa.id, belt_since || null],
  );
  return e.rows[0];
}

// ---------- listagem e cadastro ----------

r.get('/', permitir(...EQUIPE), rota(async (req, res) => {
  const academia = academiaDoPedido(req);
  const professor = ehProfessor(req.user) ? req.user.id : null;
  res.json(await q(
    `SELECT s.id, s.name, s.birth_date, s.is_active, s.academy_id, a.name AS academy_name,
            COALESCE(json_agg(json_build_object('modality_id', e.modality_id, 'belt_name', b.name, 'belt_color', b.color)
                     ORDER BY e.created_at) FILTER (WHERE e.id IS NOT NULL), '[]') AS inscricoes
       FROM students s JOIN academies a ON a.id = s.academy_id
       LEFT JOIN enrollments e ON e.student_id = s.id
       LEFT JOIN belts b ON b.id = e.belt_id
      WHERE ($1::uuid IS NULL OR s.academy_id = $1)
        AND ($2::uuid IS NULL OR EXISTS (
              SELECT 1 FROM class_enrollments ce JOIN classes c ON c.id = ce.class_id
               WHERE ce.student_id = s.id AND c.teacher_id = $2))
      GROUP BY s.id, a.name ORDER BY s.name`,
    [academia, professor],
  ));
}));

r.get('/eu', rota(async (req, res) => {
  const s = await one('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
  if (!s) throw new HttpError(404, 'Não há ficha de aluno vinculada a este usuário.');
  res.json(s);
}));

// RF-02. Menor de idade exige responsavel legal (art. 14 da LGPD); credencial
// propria so a partir de 12 anos; aceite do termo de responsabilidade.
r.post('/', permitir(...GESTAO), rota(async (req, res) => {
  const b = req.body || {};
  const academia = academiaDoPedido(req, { obrigatoria: true });
  if (!b.name) throw new HttpError(400, 'Informe o nome do aluno.');
  if (!b.birth_date) throw new HttpError(400, 'Informe a data de nascimento.');
  if (b.birth_date > hoje()) throw new HttpError(400, 'Data de nascimento inválida.');
  if (!b.terms_accepted) throw new HttpError(400, 'Registre o aceite do termo de responsabilidade.');
  const idade = idadeEm(b.birth_date, hoje());
  const menor = idade < 18;
  const g = b.guardian || {};
  if (menor && (!g.name || !(g.phone || g.email))) {
    throw new HttpError(400, 'Aluno menor de idade: informe o nome e um contato (telefone ou e-mail) do responsável legal.');
  }
  const querAcesso = !!(b.email || b.password);
  if (querAcesso && idade < 12) {
    throw new HttpError(400, 'Alunos com menos de 12 anos não recebem acesso próprio; o acompanhamento é feito pelo responsável.');
  }
  if (querAcesso && (!b.email || !b.password || b.password.length < 8)) {
    throw new HttpError(400, 'Para criar o acesso do aluno, informe e-mail e senha de ao menos 8 caracteres.');
  }
  const modalidade = b.modality_id || 'judo';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let userId = null;
    if (querAcesso) {
      const dup = await client.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [b.email]);
      if (dup.rowCount) throw new HttpError(409, 'Já existe um usuário com este e-mail.');
      const u = await client.query(
        `INSERT INTO users (name, email, password_hash, role, academy_id, phone) VALUES ($1,$2,$3,'aluno',$4,$5) RETURNING id`,
        [b.name, b.email, await bcrypt.hash(b.password, 10), academia, b.phone || null],
      );
      userId = u.rows[0].id;
    }
    const s = (await client.query(
      `INSERT INTO students (academy_id, user_id, name, birth_date, phone, emergency_contact, terms_accepted_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,now(),$7) RETURNING *`,
      [academia, userId, b.name, b.birth_date, b.phone || null, b.emergency_contact || null, b.notes || null],
    )).rows[0];
    if (menor) {
      await client.query(
        'INSERT INTO guardians (student_id, name, relation, email, phone) VALUES ($1,$2,$3,$4,$5)',
        [s.id, g.name, g.relation || null, g.email || null, g.phone || null],
      );
    }
    await criarInscricao(client, s, { modality_id: modalidade, belt_id: b.belt_id, belt_since: b.belt_since });
    if (b.class_id) {
      const turma = await client.query('SELECT * FROM classes WHERE id = $1 AND academy_id = $2', [b.class_id, academia]);
      if (!turma.rowCount) throw new HttpError(400, 'Turma inválida para esta academia.');
      if (turma.rows[0].modality_id !== modalidade) throw new HttpError(400, 'A turma é de outra modalidade.');
      await client.query('INSERT INTO class_enrollments (class_id, student_id) VALUES ($1,$2)', [b.class_id, s.id]);
    }
    await client.query('COMMIT');
    await audit(req.user, 'aluno.criado', b.name, { menor });
    res.status(201).json(s);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// RF-20: inscrever o aluno em outra modalidade.
r.post('/:id/inscricoes', permitir(...GESTAO), rota(async (req, res) => {
  const s = await carregar(req);
  const { modality_id, belt_id, belt_since } = req.body || {};
  if (!modality_id) throw new HttpError(400, 'Informe a modalidade.');
  const e = await criarInscricao(pool, s, { modality_id, belt_id, belt_since });
  await audit(req.user, 'inscricao.criada', s.name, { modality_id });
  res.status(201).json(e);
}));

// ---------- ficha, trilha e aptidao ----------

r.get('/:id', rota(async (req, res) => {
  const s = await carregar(req);
  const lista = await q(`${INSCRICOES} WHERE e.student_id = $1 ORDER BY e.created_at`, [s.id]);
  const inscricoes = [];
  for (const e of lista) inscricoes.push({ ...e, aptidao: await calcularAptidao(e, s) });
  const responsavel = await one('SELECT name, relation, email, phone FROM guardians WHERE student_id = $1 LIMIT 1', [s.id]);
  res.json({ ...s, inscricoes, responsavel, menor: s.birth_date ? idadeEm(s.birth_date, hoje()) < 18 : null });
}));

// RF-06: trilha de uma modalidade, com faixas, datas e requisitos.
r.get('/:id/trilha', rota(async (req, res) => {
  const s = await carregar(req);
  const e = await inscricao(s, req.query.modalidade);
  const faixas = await faixasDaModalidade(s.academy_id, e.modality_id);
  const historico = await q(
    `SELECT g.*, tb.name AS to_belt_name, u.name AS examiner_name FROM graduations g
       JOIN belts tb ON tb.id = g.to_belt_id LEFT JOIN users u ON u.id = g.examiner_id
      WHERE g.enrollment_id = $1 ORDER BY g.exam_date, g.created_at`,
    [e.id],
  );
  const conquistadaEm = Object.fromEntries(
    historico.filter((g) => g.result === 'aprovado').map((g) => [g.to_belt_id, g.exam_date]),
  );
  const ordemAtual = faixas.find((f) => f.id === e.belt_id)?.sort_order ?? 1;
  res.json({
    aluno: { id: s.id, name: s.name },
    inscricao: { id: e.id, modality_id: e.modality_id, modality_name: e.modality_name },
    faixas: faixas.map((f) => ({
      id: f.id, name: f.name, color: f.color,
      min_classes: f.min_classes, min_months: f.min_months, min_tech_pct: f.min_tech_pct, min_age: f.min_age,
      situacao: f.sort_order < ordemAtual ? 'concluida' : f.sort_order === ordemAtual ? 'atual' : 'futura',
      data: f.sort_order === ordemAtual ? e.belt_since : conquistadaEm[f.id] || null,
    })),
    aptidao: await calcularAptidao(e, s),
    historico,
  });
}));

// RF-14: arvore de habilidades da modalidade, agrupavel por categoria.
r.get('/:id/habilidades', rota(async (req, res) => {
  const s = await carregar(req);
  const e = await inscricao(s, req.query.modalidade);
  res.json(await q(
    `SELECT t.id, t.name, t.category, t.description, b.name AS belt_name, b.sort_order,
            COALESCE(sp.status, 'bloqueada') AS status, sp.validated_at, sp.professor_note,
            (t.required_for_belt_id = (SELECT nb.id FROM belts nb JOIN belts cb ON cb.id = $3
                                        WHERE nb.modality_id = cb.modality_id AND nb.sort_order = cb.sort_order + 1)) AS exigida_proxima
       FROM techniques t LEFT JOIN belts b ON b.id = t.required_for_belt_id
       LEFT JOIN skill_progress sp ON sp.technique_id = t.id AND sp.student_id = $1
      WHERE t.modality_id = $2 ORDER BY b.sort_order NULLS LAST, t.category, t.name`,
    [s.id, e.modality_id, e.belt_id],
  ));
}));

// RF-15: somente o professor altera o dominio; o aluno nunca se autovalida.
r.put('/:id/habilidades/:tecnicaId', permitir(...PROFESSOR), rota(async (req, res) => {
  const s = await carregar(req);
  const { status, professor_note } = req.body || {};
  if (!['bloqueada', 'apresentada', 'em-treino', 'validada'].includes(status)) throw new HttpError(400, 'Situação inválida.');
  const t = await one(
    `SELECT t.id FROM techniques t JOIN enrollments e ON e.modality_id = t.modality_id AND e.student_id = $2
      WHERE t.id = $1`,
    [req.params.tecnicaId, s.id],
  );
  if (!t) throw new HttpError(404, 'Técnica não encontrada nas modalidades do aluno.');
  const validada = status === 'validada';
  res.json(await one(
    `INSERT INTO skill_progress (student_id, technique_id, status, validated_by, validated_at, professor_note)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (student_id, technique_id) DO UPDATE
       SET status = EXCLUDED.status, validated_by = EXCLUDED.validated_by,
           validated_at = EXCLUDED.validated_at, professor_note = EXCLUDED.professor_note, updated_at = now()
     RETURNING *`,
    [s.id, t.id, status, validada ? req.user.id : null, validada ? hoje() : null, professor_note || null],
  ));
}));

// RF-05: lancamento de exame.
//  - aprovado: nova faixa, com a anterior no historico;
//  - reprovado: mantem a faixa e reinicia o contador do ciclo;
//  - aprovar quem nao esta sinalizado como apto exige confirmacao e fica na auditoria.
r.post('/:id/graduacoes', permitir(...PROFESSOR), rota(async (req, res) => {
  const s = await carregar(req);
  const { result, notes, modality_id, confirmar_excecao } = req.body || {};
  if (!['aprovado', 'reprovado'].includes(result)) throw new HttpError(400, 'Informe o resultado: aprovado ou reprovado.');
  const e = await inscricao(s, modality_id);
  const apt = await calcularAptidao(e, s);
  if (!apt.proxima_faixa) throw new HttpError(400, 'O aluno já está na última faixa prevista para a modalidade.');
  const excecao = result === 'aprovado' && !apt.sugestao_apto;
  if (excecao && confirmar_excecao !== true) {
    throw new HttpError(409, 'O aluno não está sinalizado como apto. Confirme para registrar a aprovação como exceção.', {
      requer_confirmacao: true,
    });
  }
  const r0 = apt.requisitos;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const g = (await client.query(
      `INSERT INTO graduations (enrollment_id, from_belt_id, to_belt_id, exam_date, result,
                                classes_attended, classes_required, months_in_belt, months_required,
                                tech_pct, tech_pct_required, was_flagged_apt, examiner_id, notes)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [e.id, e.belt_id, apt.proxima_faixa.id, result, r0.presencas.atual, r0.presencas.exigido,
       r0.meses.atual, r0.meses.exigido, r0.tecnicas.atual, r0.tecnicas.exigido, apt.sugestao_apto,
       req.user.id, notes || null],
    )).rows[0];
    if (result === 'aprovado') {
      await client.query('UPDATE enrollments SET belt_id = $1, belt_since = $2 WHERE id = $3', [apt.proxima_faixa.id, g.exam_date, e.id]);
    }
    await client.query('COMMIT');
    await audit(req.user, excecao ? 'exame.excecao' : 'exame.lancado', s.name, {
      result, modalidade: e.modality_id, faixa: apt.proxima_faixa.name, sinalizado_apto: apt.sugestao_apto,
    });
    res.status(201).json(g);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

export default r;
