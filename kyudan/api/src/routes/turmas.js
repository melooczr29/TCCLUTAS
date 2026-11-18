// Turmas (RF-11), matricula em turma e presenca por aula (RF-03).
import { Router } from 'express';
import { q, one, audit } from '../db.js';
import {
  HttpError, permitir, rota, academiaDoPedido, turmaVisivel, ehProfessor, EQUIPE,
} from '../auth.js';
import { hoje } from '../rules/aptidao.js';

const r = Router();
const GESTAO = ['superadmin', 'admin', 'gestor'];

async function carregarTurma(req) {
  const t = await one('SELECT * FROM classes WHERE id = $1', [req.params.id]);
  if (!t || !turmaVisivel(req.user, t)) throw new HttpError(404, 'Turma não encontrada.');
  return t;
}

// Turmas do mesmo professor que dividem um dia e se sobrepoem no horario.
async function conflitos(t, ignorarId = null) {
  if (!t.teacher_id || !t.start_time || !t.end_time || !t.weekdays?.length) return [];
  return q(
    `SELECT id, name, start_time, end_time FROM classes
      WHERE teacher_id = $1 AND is_active AND ($2::uuid IS NULL OR id <> $2)
        AND weekdays && $3::int[] AND start_time < $5::time AND end_time > $4::time`,
    [t.teacher_id, ignorarId, t.weekdays, t.start_time, t.end_time],
  );
}

r.get('/', permitir(...EQUIPE), rota(async (req, res) => {
  const academia = academiaDoPedido(req);
  const professor = ehProfessor(req.user) ? req.user.id : null;
  res.json(await q(
    `SELECT c.*, u.name AS teacher_name, a.name AS academy_name, m.name AS modality_name,
            (SELECT count(*) FROM class_enrollments e WHERE e.class_id = c.id) AS enrolled
       FROM classes c LEFT JOIN users u ON u.id = c.teacher_id
       JOIN academies a ON a.id = c.academy_id JOIN modalities m ON m.id = c.modality_id
      WHERE ($1::uuid IS NULL OR c.academy_id = $1) AND ($2::uuid IS NULL OR c.teacher_id = $2)
      ORDER BY c.name`,
    [academia, professor],
  ));
}));

// RF-11: modalidade, dias, horario, capacidade e mestre responsavel.
// Conflito de horario do mestre exige confirmacao (fluxo alternativo).
r.post('/', permitir(...GESTAO), rota(async (req, res) => {
  const b = req.body || {};
  const academia = academiaDoPedido(req, { obrigatoria: true });
  if (!b.name) throw new HttpError(400, 'Informe o nome da turma.');
  const modalidade = b.modality_id || 'judo';
  if (!(await one('SELECT 1 FROM modalities WHERE id = $1', [modalidade]))) throw new HttpError(400, 'Modalidade inválida.');
  if (b.teacher_id && !(await one(
    "SELECT 1 FROM users WHERE id = $1 AND academy_id = $2 AND role IN ('mestre','autonomo') AND is_active",
    [b.teacher_id, academia],
  ))) {
    throw new HttpError(400, 'O responsável precisa ser um mestre ativo desta academia.');
  }
  if (b.start_time && b.end_time && b.start_time >= b.end_time) throw new HttpError(400, 'O horário de fim deve ser depois do início.');
  const nova = {
    teacher_id: b.teacher_id || null, weekdays: (b.weekdays || []).map(Number),
    start_time: b.start_time || null, end_time: b.end_time || null,
  };
  const choques = await conflitos(nova);
  if (choques.length && b.confirmar_conflito !== true) {
    throw new HttpError(409, `Conflito de horário com: ${choques.map((c) => c.name).join(', ')}. Confirme para criar mesmo assim.`, {
      requer_confirmacao: true,
    });
  }
  const t = await one(
    `INSERT INTO classes (academy_id, name, modality_id, teacher_id, weekdays, start_time, end_time, capacity)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [academia, b.name, modalidade, nova.teacher_id, nova.weekdays, nova.start_time, nova.end_time, b.capacity || null],
  );
  await audit(req.user, 'turma.criada', t.name, choques.length ? { conflito_confirmado: choques.map((c) => c.name) } : null);
  res.status(201).json(t);
}));

// Matricula na turma: respeita a capacidade e exige inscricao na modalidade.
r.post('/:id/matriculas', permitir(...GESTAO), rota(async (req, res) => {
  const t = await carregarTurma(req);
  const s = await one('SELECT id, name FROM students WHERE id = $1 AND academy_id = $2', [req.body?.student_id, t.academy_id]);
  if (!s) throw new HttpError(400, 'Aluno inválido para esta academia.');
  if (!(await one('SELECT 1 FROM enrollments WHERE student_id = $1 AND modality_id = $2', [s.id, t.modality_id]))) {
    throw new HttpError(400, 'Inscreva o aluno na modalidade da turma antes de matriculá-lo.');
  }
  if (t.capacity) {
    const { n } = await one('SELECT count(*) AS n FROM class_enrollments WHERE class_id = $1', [t.id]);
    if (n >= t.capacity) throw new HttpError(409, `A turma está cheia (capacidade: ${t.capacity}).`);
  }
  await q('INSERT INTO class_enrollments (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, s.id]);
  res.status(201).json({ ok: true });
}));

// RF-03: lista ja carregada com os matriculados, a faixa da modalidade da
// turma e quem esta presente na aula da data.
r.get('/:id/chamada', permitir(...EQUIPE), rota(async (req, res) => {
  const t = await carregarTurma(req);
  const data = req.query.data || hoje();
  res.json({
    turma: t,
    data,
    alunos: await q(
      `SELECT s.id, s.name, b.name AS belt_name, b.color AS belt_color, (a.id IS NOT NULL) AS presente
         FROM class_enrollments ce JOIN students s ON s.id = ce.student_id
         LEFT JOIN enrollments e ON e.student_id = s.id AND e.modality_id = $3
         LEFT JOIN belts b ON b.id = e.belt_id
         LEFT JOIN lessons l ON l.class_id = ce.class_id AND l.lesson_date = $2
         LEFT JOIN attendance a ON a.lesson_id = l.id AND a.student_id = s.id
        WHERE ce.class_id = $1 AND s.is_active ORDER BY s.name`,
      [t.id, data, t.modality_id],
    ),
  });
}));

// Marca ou desmarca a presenca de um aluno na aula da data (um toque, RNF-02).
// A situacao financeira nunca interfere aqui (RF-17).
r.post('/:id/presencas', permitir('superadmin', 'admin', 'mestre', 'autonomo'), rota(async (req, res) => {
  const t = await carregarTurma(req);
  const { student_id, presente = true } = req.body || {};
  const data = req.body?.data || hoje();
  if (data > hoje()) throw new HttpError(400, 'Não é possível registrar presença em data futura.');
  const s = await one(
    `SELECT s.id, s.name FROM students s JOIN class_enrollments ce ON ce.student_id = s.id AND ce.class_id = $2
      WHERE s.id = $1`,
    [student_id, t.id],
  );
  if (!s) throw new HttpError(404, 'Aluno não matriculado nesta turma.');
  const aula = await one(
    `INSERT INTO lessons (class_id, lesson_date) VALUES ($1,$2)
     ON CONFLICT (class_id, lesson_date) DO UPDATE SET lesson_date = EXCLUDED.lesson_date RETURNING id`,
    [t.id, data],
  );
  if (presente) {
    await q(
      'INSERT INTO attendance (lesson_id, student_id, recorded_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [aula.id, s.id, req.user.id],
    );
  } else {
    await q('DELETE FROM attendance WHERE lesson_id = $1 AND student_id = $2', [aula.id, s.id]);
  }
  res.json({ student_id: s.id, name: s.name, data, presente });
}));

export default r;
