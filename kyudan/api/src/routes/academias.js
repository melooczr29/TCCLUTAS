import { Router } from 'express';
import { q, one, audit } from '../db.js';
import { HttpError, permitir, rota, ehGlobal } from '../auth.js';

const r = Router();

r.get('/', rota(async (req, res) => {
  const so = ehGlobal(req.user) ? null : req.user.academy_id;
  if (!ehGlobal(req.user) && !so) return res.json([]);
  res.json(await q(
    `SELECT a.*,
            (SELECT count(*) FROM students s WHERE s.academy_id = a.id AND s.is_active) AS active_students,
            (SELECT count(*) FROM classes c WHERE c.academy_id = a.id AND c.is_active) AS active_classes
       FROM academies a WHERE ($1::uuid IS NULL OR a.id = $1) ORDER BY a.name`,
    [so],
  ));
}));

r.post('/', permitir('superadmin', 'admin'), rota(async (req, res) => {
  const b = req.body || {};
  if (!b.name) throw new HttpError(400, 'Informe o nome da academia.');
  const slug = (b.slug || b.name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (await one('SELECT 1 FROM academies WHERE slug = $1', [slug])) throw new HttpError(409, 'Já existe uma academia com este nome.');
  const a = await one(
    `INSERT INTO academies (name, slug, owner_name, owner_email, owner_phone, city, state, address, modalities)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [b.name, slug, b.owner_name || null, b.owner_email || null, b.owner_phone || null, b.city || null,
     b.state || null, b.address || null, b.modalities?.length ? b.modalities : ['judo']],
  );
  await audit(req.user, 'academia.criada', a.name);
  res.status(201).json(a);
}));

r.patch('/:id/status', permitir('superadmin', 'admin'), rota(async (req, res) => {
  const a = await one('UPDATE academies SET status = $1, updated_at = now() WHERE id = $2 RETURNING *', [req.body?.status, req.params.id]);
  if (!a) throw new HttpError(404, 'Academia não encontrada.');
  await audit(req.user, 'academia.status', a.name, { status: a.status });
  res.json(a);
}));

export default r;
