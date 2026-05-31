/**
 * Augmenta o tipo Request do Express para incluir o usuário autenticado.
 * Preenchido pelo authMiddleware após validar o JWT. Tipado para que os
 * controllers acessem `req.user` com segurança de tipos (sem `any`).
 */
import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      role: Role;
    }
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
