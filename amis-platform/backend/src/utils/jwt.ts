/**
 * ============================================================================
 * Utilitários de JWT
 * ----------------------------------------------------------------------------
 * Centraliza a assinatura e verificação de tokens. O payload é mínimo
 * (apenas `sub` = id do usuário e `role`) para evitar trafegar PII no token.
 * A verificação distingue token expirado de token inválido, permitindo que o
 * middleware retorne mensagens precisas (mas sem vazar detalhes internos).
 * ============================================================================
 */
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from './AppError';

export interface AuthTokenPayload {
  /** Subject: ID (UUID) do usuário. */
  sub: string;
  role: Role;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'amis-platform',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'amis-platform',
    }) as JwtPayload;

    if (!decoded.sub || !decoded.role) {
      throw AppError.unauthorized('Token malformado.', 'TOKEN_MALFORMED');
    }

    return { sub: String(decoded.sub), role: decoded.role as Role };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Sessão expirada. Faça login novamente.', 'TOKEN_EXPIRED');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('Token inválido.', 'TOKEN_INVALID');
    }
    throw err;
  }
}
