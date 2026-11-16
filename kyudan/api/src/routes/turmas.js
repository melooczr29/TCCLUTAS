// Turmas (RF-11), matricula e presenca aula a aula (RF-03).
import { Router } from 'express';
import { q, one, audit } from '../db.js';
import { HttpError, permitir, rota, academiaDoPedido, exigirMesmaAcademia, EQUIPE } from '../auth.js';

const r = Router();
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

async function carregarTurma(req) {
  const t = await one('SELECT * FROM classes WHERE id = $1', [req.params.id]);
  if (!t) throw new HttpError(404, 'Turma não encontrada.');
  exigirMesmaAcademia(req.user, t.academy_id);
  return t;
}

r.get('/', permitir(...EQUIPE), rota(async (req, res) => {
  const academia = academiaDoPedido(req);
  res.json(await q(
    `SELECT c.*, u.name AS teacher_name, a.name AS academy_name,
            (SELECT count(*) FROM class_enrollments e WHERE e.class_id = c.id) AS enrolled
       FROM classes c LEFT JOIN users u ON u.id = c.teacher_id JOIN academies a ON a.id = c.academy_id
      WHERE ($1::uuid IS NULL OR c.academy_id = $1) ORDER BY c.name`,
    [academia],
  ));
}));

r.post('/', permitir('superadmin', 'admin', 'gestor'), rota(async (req, res) => {
  const b = req.body || {};
  const academia = academiaDoPedido(req, { obrigatoria: true });
  if (!b.name) throw new HttpError(400, 'Informe o nome da turma.');
  if (b.teacher_id && !(await one('SELECT 1 FROM users WHERE id = $1 AND academy_id = $2', [b.teacher_id, academia]))) {
    throw new HttpError(400, 'Professor inválido para esta academia.');
  }
  const t = await one(
    `INSERT INTO classes (academy_id, name, modality_id, teacher_id, weekdays, start_time, end_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [academia, b.name, b.modality_id || 'judo', b.teacher_id || null, b.weekdays || [], b.start_time || null, b.end_time || null],
  );
  await audit(req.user, 'turma.criada', t.name);
  res.status(201).json(t);
}));

r.post('/:id/matriculas', permitir('superadmin', 'admin', 'gestor', 'mestre'), rota(async (req, res) => {
  const t = await carregarTurma(req);
  const s = await one('SELECT id FROM students WHERE id = $1 AND academy_id = $2', [req.body?.student_id, t.academy_id]);
  if (!s) throw new HttpError(400, 'Aluno inválido para esta academia.');
  await q('INSERT INTO class_enrollments (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, s.id]);
  res.status(201).json({ ok: true });
}));

// Lista de chamada de uma data: alunos matriculados e quem ja esta presente.
r.get('/:id/chamada', permitir(...EQUIPE), rota(async (req, res) => {
  const t = await carregarTurma(req);
  const data = req.query.data || hoje();
  res.json({
    turma: t,
    data,
    alunos: await q(
      `SELECT s.id, s.name, b.name AS belt_name, b.color AS belt_color, (at.id IS NOT NULL) AS presente
         FROM class_enrollments e JOIN students s ON s.id = e.student_id
         LEFT JOIN belts b ON b.id = s.belt_id
         LEFT JOIN attendance at ON at.class_id = e.class_id AND at.student_id = s.id AND at.class_date = $2
        WHERE e.class_id = $1 AND s.is_active ORDER BY s.name`,
      [t.id, data],
    ),
  });
}));

// Marca ou desmarca presenca. Aceita student_id (chamada) ou qr_token (leitura de codigo).
r.post('/:id/presencas', permitir('superadmin', 'admin', 'mestre', 'autonomo', 'gestor'), rota(async (req, res) => {
  const t = await carregarTurma(req);
  const { student_id, qr_token, presente = true } = req.body || {};
  const data = req.body?.data || hoje();
  const s = qr_token
    ? await one('SELECT id, name FROM students WHERE qr_token = $1 AND academy_id = $2', [qr_token, t.academy_id])
    : await one('SELECT id, name FROM students WHERE id = $1 AND academy_id = $2', [student_id, t.academy_id]);
  if (!s) throw new HttpError(404, 'Aluno não encontrado nesta academia.');
  if (presente) {
    await q(
      `INSERT INTO attendance (class_id, student_id, class_date, method, recorded_by)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (class_id, student_id, class_date) DO NOTHING`,
      [t.id, s.id, data, qr_token ? 'qr' : 'chamada', req.user.id],
    );
  } else {
    await q('DELETE FROM attendance WHERE class_id = $1 AND student_id = $2 AND class_date = $3', [t.id, s.id, data]);
  }
  res.json({ student_id: s.id, name: s.name, data, presente });
}));

export default r;
