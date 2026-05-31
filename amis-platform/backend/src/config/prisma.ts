/**
 * ============================================================================
 * Cliente Prisma (Singleton)
 * ----------------------------------------------------------------------------
 * - Reutiliza UMA única instância do PrismaClient em todo o processo. Em
 *   desenvolvimento, o `tsx watch` recarrega módulos com frequência; sem o
 *   cache no globalThis, abriríamos múltiplos pools de conexão e esgotaríamos
 *   o limite de conexões do PostgreSQL.
 * - Logs de query só são habilitados fora de produção, evitando vazamento de
 *   dados sensíveis (PII) nos logs em produção (boa prática LGPD).
 * ============================================================================
 */
import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['query', 'warn', 'error'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
