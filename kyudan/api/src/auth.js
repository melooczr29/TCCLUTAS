// Autenticacao (RF-01) e controle de acesso por perfil.
import jwt from 'jsonwebtoken';
import { one } from './db.js';

export const GLOBAIS = ['superadmin', 'admin']; // enxergam todas as academias
export const EQUIPE = ['superadmin', 'admin', 'gestor', 'mestre', 'autonomo'];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function assinarToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

// O usuario e relido do banco a cada requisicao. Assim, quando um acesso e
// revogado, ele deixa de valer na hora, mesmo com o token ainda no prazo.
export async function autenticar(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Faça login para continuar.');
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new HttpError(401, 'Sessão expirada. Faça login novamente.');
    }
    const user = await one(
      'SELECT id, name, email, role, academy_id, is_active FROM users WHERE id = $1',
      [payload.sub],
    );
    if (!user) throw new HttpError(401, 'Usuário não encontrado.');
    if (!user.is_active) throw new HttpError(403, 'Seu acesso foi revogado.');
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export const permitir = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new HttpError(403, 'Seu perfil não tem permissão para isso.'));

export const ehGlobal = (user) => GLOBAIS.includes(user.role);

// Academia que o usuario pode enxergar. Perfis globais podem escolher
// (?academy_id=) ou ver todas (retorna null). Os demais ficam presos a sua.
export function academiaDoPedido(req, { obrigatoria = false } = {}) {
  if (ehGlobal(req.user)) {
    const id = req.query.academy_id || req.body?.academy_id || null;
    if (obrigatoria && !id) throw new HttpError(400, 'Informe a academia (academy_id).');
    return id;
  }
  if (!req.user.academy_id) throw new HttpError(403, 'Usuário sem academia vinculada.');
  return req.user.academy_id;
}

// Garante que um registro pertence a uma academia visivel ao usuario.
export function exigirMesmaAcademia(user, academyId) {
  if (ehGlobal(user)) return;
  if (!academyId || academyId !== user.academy_id) {
    throw new HttpError(404, 'Registro não encontrado.');
  }
}

export const rota = (fn) => (req, res, next) => fn(req, res, next).catch(next);
