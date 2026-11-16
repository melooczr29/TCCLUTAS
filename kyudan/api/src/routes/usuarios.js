// Contas e acessos. As regras ficam em rules/acessos.js.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q, one, audit } from '../db.js';
import { HttpError, permitir, rota, ehGlobal } from '../auth.js';
import { podeCriar, podeGerenciar } from '../rules/acessos.js';

const r = Router();
const CAMPOS = `u.id, u.name, u.email, u.role, u.academy_id, a.name AS academy_name,
                u.phone, u.is_active, u.revoked_at, u.created_at`;

r.get('/', permitir('superadmin', 'admin', 'gestor'), rota(async (req, res) => {
  const academia = ehGlobal(req.user) ? req.query.academy_id || null : req.user.academy_id;
  res.json(await q(
    `SELECT ${CAMPOS} FROM users u LEFT JOIN academies a ON a.id = u.academy_id
      WHERE ($1::uuid IS NULL OR u.academy_id = $1)
      ORDER BY array_position(ARRAY['superadmin','admin','gestor','mestre','autonomo','aluno'], u.role), u.name`,
    [academia],
  ));
}));

r.post('/', permitir('superadmin', 'admin', 'gestor'), rota(async (req, res) => {
  const { name, email, password, role, phone } = req.body || {};
  if (!name || !email || !password || !role) throw new HttpError(400, 'Informe nome, e-mail, senha e perfil.');
  if (password.length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres.');
  podeCriar(req.user, role);
  let academyId = null;
  if (role !== 'admin') {
    academyId = ehGlobal(req.user) ? req.body.academy_id || null : req.user.academy_id;
    if (!academyId && role !== 'autonomo') throw new HttpError(400, 'Informe a academia deste usuário.');
  }
  if (await one('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email])) {
    throw new HttpError(409, 'Já existe um usuário com este e-mail.');
  }
  const novo = await one(
    `INSERT INTO users (name, email, password_hash, role, academy_id, phone)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role, academy_id, is_active`,
    [name, email, await bcrypt.hash(password, 10), role, academyId, phone || null],
  );
  await audit(req.user, 'usuario.criado', email, { role });
  res.status(201).json(novo);
}));

// Revogar ou devolver o acesso. Vale na hora (ver auth.js).
r.patch('/:id/acesso', permitir('superadmin', 'admin', 'gestor'), rota(async (req, res) => {
  const ativo = req.body?.is_active;
  if (typeof ativo !== 'boolean') throw new HttpError(400, 'Informe is_active (true ou false).');
  const alvo = await one('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!alvo) throw new HttpError(404, 'Usuário não encontrado.');
  podeGerenciar(req.user, alvo);
  const u = await one(
    `UPDATE users SET is_active = $1,
            revoked_at = CASE WHEN $1 THEN NULL ELSE now() END,
            revoked_by = CASE WHEN $1 THEN NULL ELSE $2::uuid END,
            updated_at = now()
      WHERE id = $3 RETURNING id, name, email, role, is_active, revoked_at`,
    [ativo, req.user.id, alvo.id],
  );
  await audit(req.user, ativo ? 'acesso.reativado' : 'acesso.revogado', alvo.email, { role: alvo.role });
  res.json(u);
}));

r.delete('/:id', permitir('superadmin'), rota(async (req, res) => {
  const alvo = await one('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!alvo) throw new HttpError(404, 'Usuário não encontrado.');
  podeGerenciar(req.user, alvo);
  await q('DELETE FROM users WHERE id = $1', [alvo.id]);
  await audit(req.user, 'usuario.excluido', alvo.email, { role: alvo.role });
  res.status(204).end();
}));

export default r;
