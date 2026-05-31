/**
 * ============================================================================
 * AMIS API - Inicialização do servidor HTTP
 * ----------------------------------------------------------------------------
 * Responsável apenas por subir o app (criado em app.ts) numa porta e tratar o
 * encerramento gracioso (SIGTERM/SIGINT), fechando o pool do Prisma. Manter o
 * `listen()` fora do app.ts permite que os testes (Supertest) usem o app sem
 * abrir uma porta real.
 * ============================================================================
 */
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info('AMIS API no ar', { port: env.PORT, env: env.NODE_ENV });
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`Recebido ${signal}, encerrando graciosamente...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Conexões encerradas. Até logo.');
    process.exit(0);
  });
  // Força a saída se algo travar por mais de 10s.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
