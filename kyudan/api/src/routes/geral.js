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

r.get('/faixas', rota(async (req, res) => {
  const academia = ehGlobal(req.user) ? req.query.academy_id || null : req.user.academy_id;
  res.json(await faixasDaModalidade(academia, req.query.modalidade || 'judo'));
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
            (SELECT count(*) FROM attendance at JOIN classes c ON c.id = at.class_id
              WHERE at.class_date >= CURRENT_DATE - 30 AND ($1::uuid IS NULL OR c.academy_id = $1)) AS presencas_30_dias`,
    [academia],
  ));
}));

r.get('/auditoria', permitir('superadmin'), rota(async (_req, res) => {
  res.json(await q('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200'));
}));

export default r;
