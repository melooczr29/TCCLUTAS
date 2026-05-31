/**
 * ============================================================================
 * Configuração e Validação de Ambiente (Fail-Fast)
 * ----------------------------------------------------------------------------
 * Por que validar variáveis de ambiente com Zod?
 *  - Princípio "fail-fast": se um segredo crítico (ex.: JWT_SECRET ou
 *    DATABASE_URL) estiver ausente ou malformado, a aplicação NÃO inicia.
 *    Isso evita o cenário perigoso de a API subir em produção com um segredo
 *    fraco/indefinido e ficar exposta silenciosamente.
 *  - Centraliza o acesso a `process.env` em um único objeto tipado (`env`),
 *    eliminando "magic strings" espalhadas pelo código.
 * ============================================================================
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(3333),

  DATABASE_URL: z
    .string()
    .url('DATABASE_URL deve ser uma URL de conexão válida.'),

  // Segredo JWT com tamanho mínimo para resistir a ataques de força bruta.
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres.'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Chave secreta da Stripe. Em produção exige prefixo `sk_`.
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'STRIPE_SECRET_KEY é obrigatória.'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Origens CORS permitidas (string separada por vírgulas).
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Logamos os campos com erro SEM imprimir os valores (que podem ser segredos).
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(
    `\n[FATAL] Variáveis de ambiente inválidas. A API não será iniciada:\n${issues}\n`,
  );
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
  /** Lista normalizada de origens CORS permitidas. */
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
