/**
 * ============================================================================
 * AuthService - Cadastro e Autenticação
 * ----------------------------------------------------------------------------
 * Regras de segurança aplicadas:
 *  - Senhas são derivadas com Bcrypt (cost factor 12). Bcrypt é lento por
 *    design e usa salt por hash, mitigando ataques de rainbow table e
 *    força bruta (OWASP A02 - Cryptographic Failures).
 *  - Mensagem de erro genérica no login ("Credenciais inválidas") para não
 *    revelar se o e-mail existe (anti user-enumeration).
 *  - O hash da senha NUNCA é retornado nas respostas.
 * ============================================================================
 */
import bcrypt from 'bcryptjs';
import type { Role, User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

const BCRYPT_COST = 12;

/** Versão pública do usuário (sem o hash da senha). */
export type SafeUser = Omit<User, 'passwordHash'>;

function toSafeUser(user: User): SafeUser {
  const { passwordHash: _omit, ...safe } = user;
  void _omit;
  return safe;
}

export class AuthService {
  static async register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw AppError.conflict('E-mail já cadastrado.', 'EMAIL_IN_USE');
    }

    const passwordHash = await bcrypt.hash(input.senha, BCRYPT_COST);

    const user = await prisma.user.create({
      data: {
        nome: input.nome,
        email: input.email,
        passwordHash,
        role: input.role as Role,
        telefone: input.telefone ?? null,
      },
    });

    const token = signToken({ sub: user.id, role: user.role });
    return { user: toSafeUser(user), token };
  }

  static async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Comparação ocorre mesmo quando o usuário não existe? Aqui retornamos cedo,
    // mas usamos a MESMA mensagem genérica para não revelar a existência do e-mail.
    if (!user || !user.ativo) {
      throw AppError.unauthorized('Credenciais inválidas.', 'INVALID_CREDENTIALS');
    }

    const passwordOk = await bcrypt.compare(input.senha, user.passwordHash);
    if (!passwordOk) {
      throw AppError.unauthorized('Credenciais inválidas.', 'INVALID_CREDENTIALS');
    }

    const token = signToken({ sub: user.id, role: user.role });
    return { user: toSafeUser(user), token };
  }

  static async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('Usuário não encontrado.', 'USER_NOT_FOUND');
    return toSafeUser(user);
  }
}
