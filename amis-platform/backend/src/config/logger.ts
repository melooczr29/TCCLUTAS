/**
 * ============================================================================
 * Logger minimalista e seguro
 * ----------------------------------------------------------------------------
 * Logger leve sem dependências externas. O ponto crucial de segurança/LGPD é
 * NUNCA logar dados sensíveis (senhas, tokens, dados de cartão). Por isso a
 * aplicação loga apenas mensagens e identificadores não-sensíveis.
 * Em produção, a saída é em JSON (amigável a coletores como Datadog/CloudWatch).
 * ============================================================================
 */
import { env } from './env';

type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  const line = env.isProduction ? JSON.stringify(entry) : formatPretty(entry);

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function formatPretty(entry: Record<string, unknown>): string {
  const { ts, level, message, meta } = entry as {
    ts: string;
    level: string;
    message: string;
    meta?: unknown;
  };
  const base = `[${ts}] ${level.toUpperCase().padEnd(5)} ${message}`;
  return meta ? `${base} ${JSON.stringify(meta)}` : base;
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (!env.isProduction) emit('debug', msg, meta);
  },
};
