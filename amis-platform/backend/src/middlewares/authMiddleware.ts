/**
 * ============================================================================
 * authMiddleware - Autenticação JWT + RBAC (Role-Based Access Control)
 * ----------------------------------------------------------------------------
 * Duas camadas independentes e componíveis:
 *
 *  1) authenticate:
 *     - Extrai o token do header `Authorization: Bearer <token>`.
 *     - Valida assinatura e expiração (verifyToken trata TokenExpiredError).
 *     - Anexa { id, role } em `req.user`.
 *
 *  2) authorize(...roles):
 *     - Bloqueia o acesso se a Role do usuário não estiver na lista permitida.
 *     - Usado para blindar rotas financeiras/administrativas (ex.: somente
 *       GESTOR aciona cobranças; somente SENSEI/GESTOR registra presença).
 *
 * Mitiga OWASP A01 (Broken Access Control) e A07 (Identification & Auth.).
 * ============================================================================
 */
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Token de autenticação ausente.', 'TOKEN_MISSING');
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw AppError.unauthorized('Token de autenticação ausente.', 'TOKEN_MISSING');
  }

  // verifyToken lança AppError 401 em caso de token inválido/expirado.
  const payload = verifyToken(token);

  req.user = { id: payload.sub, role: payload.role };
  next();
}

/**
 * Cria um middleware que só permite o acesso às Roles informadas.
 * Deve ser usado SEMPRE após `authenticate`.
 *
 * @example
 *   router.post('/cobrancas', authenticate, authorize('GESTOR'), handler)
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Defesa em profundidade: nunca deveria ocorrer se `authenticate` rodou.
      throw AppError.unauthorized('Não autenticado.', 'NOT_AUTHENTICATED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden(
        'Você não possui permissão para executar esta ação.',
        'INSUFFICIENT_ROLE',
      );
    }

    next();
  };
}
