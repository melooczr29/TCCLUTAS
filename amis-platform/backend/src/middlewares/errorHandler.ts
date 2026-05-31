/**
 * ============================================================================
 * Handler Global de Erros + Not Found
 * ----------------------------------------------------------------------------
 * Última linha de defesa. Princípios:
 *  - NUNCA vazar stack traces, mensagens internas do Prisma ou detalhes de
 *    infraestrutura para o cliente final (OWASP A05 - Security Misconfig.).
 *  - Erros operacionais (AppError) retornam mensagem amigável + status.
 *  - Erros conhecidos do Prisma (P2002 etc.) são traduzidos para mensagens
 *    seguras, sem expor nomes de colunas/SQL.
 *  - Qualquer outro erro vira um 500 genérico; o detalhe vai apenas para o log
 *    interno do servidor.
 * ============================================================================
 */
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';

/** Rota não encontrada (404). Registrado após todas as rotas. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // O 4º parâmetro é obrigatório para o Express reconhecer como error handler.
  _next: NextFunction,
): void {
  // 1) Erros operacionais previstos
  if (err instanceof AppError) {
    const payload: Record<string, unknown> = {
      status: 'error',
      code: err.code ?? 'APP_ERROR',
      message: err.message,
    };
    const details = (err as AppError & { details?: unknown }).details;
    if (details) payload.details = details;

    res.status(err.statusCode).json(payload);
    return;
  }

  // 2) Erros conhecidos do Prisma -> mensagens seguras (sem detalhes de SQL)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        status: 'error',
        code: 'UNIQUE_CONSTRAINT',
        message: 'Registro já existe com um valor que deve ser único.',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Recurso não encontrado.',
      });
      return;
    }
  }

  // 3) Erro inesperado: loga detalhes internamente, responde genérico.
  logger.error('Erro não tratado', {
    path: `${req.method} ${req.originalUrl}`,
    name: err instanceof Error ? err.name : 'Unknown',
    message: err instanceof Error ? err.message : String(err),
    // Stack só é logado; jamais enviado ao cliente.
    ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });

  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'Ocorreu um erro interno. Tente novamente mais tarde.',
  });
}
