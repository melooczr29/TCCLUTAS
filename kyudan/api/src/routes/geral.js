// Avisos (RF-07), faixas (RF-10/RF-20), painel e auditoria.
import { Router } from 'express';
import { q, one, audit } from '../db.js';
import { HttpError, permitir, rota, ehGlobal, academiaDoPedido } from '../auth.js';
import { faixasDaModalidade } from '../rules/aptidao.js';

const r = Router();

r.get('/avisos', rota(async (req, res) => {
  const academia = ehGlobal(req.user) ? req.query.academy_id || null : req.user.academy_id;
  if (!ehGlobal(req.user) && !academia) return res.json([]);
  res.json(await q(
    `SELECT n.*, u.name AS author_name, c.name AS class_name, a.name AS academy_name
       FROM announcements n LEFT JOIN users u ON u.id = n.author_id
       LEFT JOIN classes c ON c.id = n.class_id JOIN academies a ON a.id = n.academy_id
      WHERE ($1::uuid IS NULL OR n.academy_id = $1)
        AND ($2 <> 'aluno' OR n.class_id IS NULL OR n.class_id IN (
              SELECT e.class_id FROM class_enrollments e JOIN students s ON s.id = e.student_id WHERE s.user_id = $3))
      ORDER BY n.created_at DESC LIMIT 100`,
    [academia, req.user.role, req.user.id],
  ));
}));

r.post('/avisos', permitir('superadmin', 'admin', 'gestor', 'mestre'), rota(async (req, res) => {
  const { title, body, class_id } = req.body || {};
  const academia = academiaDoPedido(req, { obrigatoria: true });
  if (!title || !body) throw new HttpError(400, 'Informe título e texto do aviso.');
  if (class_id && !(await one('SELECT 1 FROM classes WHERE id = $1 AND academy_id = $2', [class_id, academia]))) {
    throw new HttpError(400, 'Turma inválida para esta academia.');
  }
  res.status(201).json(await one(
    'INSERT INTO announcements (academy_id, class_id, author_id, title, body) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [academia, class_id || null, req.user.id, title, body],
  ));
}));

r.get('/modalidades', rota(async (_req, res) => res.json(await q('SELECT * FROM modalities ORDER BY name'))));

r.get('/faixas', rota(async (req, res) => {
  const academia = ehGlobal(req.user) ? req.query.academy_id || null : req.user.academy_id;
  res.json(await faixasDaModalidade(academia, req.query.modalidade || 'judo'));
}));

// RF-10: a gestao configura os requisitos de cada faixa para a sua academia.
// Exames ja lancados guardam os requisitos da epoca, entao a mudanca vale so
// para os ciclos em andamento (fluxo alternativo do RF-10).
r.put('/faixas/:beltId', permitir('superadmin', 'admin', 'gestor'), rota(async (req, res) => {
  const academia = academiaDoPedido(req, { obrigatoria: true });
  const belt = await one('SELECT * FROM belts WHERE id = $1', [req.params.beltId]);
  if (!belt) throw new HttpError(404, 'Faixa não encontrada.');
  if (belt.sort_order === 1) throw new HttpError(400, 'A faixa inicial não tem requisitos de progressão.');
  const n = (v, nome, max = 100000) => {
    const x = Number(v);
    if (!Number.isInteger(x) || x < 0 || x > max) throw new HttpError(400, `Valor inválido para ${nome}.`);
    return x;
  };
  const b = req.body || {};
  const v = {
    min_classes: n(b.min_classes, 'presenças mínimas'),
    min_months: n(b.min_months, 'tempo mínimo em meses', 600),
    min_tech_pct: n(b.min_tech_pct ?? 100, 'percentual de técnicas', 100),
    min_age: b.min_age === '' || b.min_age == null ? null : n(b.min_age, 'idade mínima', 120),
  };
  await q(
    `INSERT INTO belt_settings (academy_id, belt_id, min_classes, min_months, min_age, min_tech_pct, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (academy_id, belt_id) DO UPDATE SET min_classes = EXCLUDED.min_classes,
       min_months = EXCLUDED.min_months, min_age = EXCLUDED.min_age, min_tech_pct = EXCLUDED.min_tech_pct,
       updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [academia, belt.id, v.min_classes, v.min_months, v.min_age, v.min_tech_pct, req.user.id],
  );
  await audit(req.user, 'faixa.configurada', `${belt.modality_id} ${belt.name}`, v);
  res.json((await faixasDaModalidade(academia, belt.modality_id)).find((f) => f.id === belt.id));
}));

// Painel: numeros da plataforma (perfis globais) ou da academia.
r.get('/painel', rota(async (req, res) => {
  if (req.user.role === 'aluno') return res.json({});
  const academia = ehGlobal(req.user) ? req.query.academy_id || null : req.user.academy_id;
  res.json(await one(
    `SELECT (SELECT count(*) FROM academies WHERE ($1::uuid IS NULL OR id = $1)) AS academias,
            (SELECT count(*) FROM students WHERE is_active AND ($1::uuid IS NULL OR academy_id = $1)) AS alunos_ativos,
            (SELECT count(*) FROM classes WHERE is_active AND ($1::uuid IS NULL OR academy_id = $1)) AS turmas,
            (SELECT count(*) FROM users WHERE ($1::uuid IS NULL OR academy_id = $1)) AS usuarios,
            (SELECT count(*) FROM attendance at JOIN lessons l ON l.id = at.lesson_id JOIN classes c ON c.id = l.class_id
              WHERE l.lesson_date >= CURRENT_DATE - 30 AND ($1::uuid IS NULL OR c.academy_id = $1)) AS presencas_30_dias`,
    [academia],
  ));
}));

r.get('/auditoria', permitir('superadmin'), rota(async (_req, res) => {
  res.json(await q('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200'));
}));

export default r;
