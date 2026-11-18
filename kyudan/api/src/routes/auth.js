import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { one, audit } from '../db.js';
import { HttpError, assinarToken, autenticar, rota } from '../auth.js';

const r = Router();
const MAX_TENTATIVAS = 5;

r.post('/login', rota(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'Informe e-mail e senha.');
  const user = await one('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  // RF-01: bloqueio temporario apos 5 tentativas consecutivas.
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    const min = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw new HttpError(429, `Acesso bloqueado por excesso de tentativas. Tente de novo em ${min} min.`);
  }
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    if (user) {
      const t = await one(
        `UPDATE users SET failed_logins = failed_logins + 1,
                locked_until = CASE WHEN failed_logins + 1 >= $2 THEN now() + interval '15 minutes' END
          WHERE id = $1 RETURNING failed_logins`,
        [user.id, MAX_TENTATIVAS],
      );
      await audit(null, 'login.falhou', user.email, { tentativas: t.failed_logins });
      if (t.failed_logins >= MAX_TENTATIVAS) {
        await one('UPDATE users SET failed_logins = 0 WHERE id = $1', [user.id]);
        throw new HttpError(429, 'Acesso bloqueado por 15 min após 5 tentativas incorretas.');
      }
    }
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  if (!user.is_active) throw new HttpError(403, 'Seu acesso foi revogado.');
  await one('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [user.id]);
  await audit(user, 'login', user.email);
  res.json({
    token: assinarToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, academy_id: user.academy_id },
  });
}));

r.get('/me', autenticar, rota(async (req, res) => res.json(req.user)));

r.post('/password', autenticar, rota(async (req, res) => {
  const { current, next } = req.body || {};
  if (!next || next.length < 8) throw new HttpError(400, 'A nova senha precisa ter ao menos 8 caracteres.');
  const user = await one('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(current || '', user.password_hash))) throw new HttpError(401, 'Senha atual incorreta.');
  await one('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [await bcrypt.hash(next, 10), req.user.id]);
  await audit(req.user, 'senha.alterada', req.user.email);
  res.json({ ok: true });
}));

export default r;
