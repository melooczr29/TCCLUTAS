/**
 * Define variáveis de ambiente ANTES de qualquer import dos módulos da app.
 * Sem isto, `src/config/env.ts` (validação fail-fast com Zod) chamaria
 * process.exit(1) por falta de segredos, abortando a suíte de testes.
 *
 * Estes valores são FAKE e usados apenas em ambiente de teste.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '3333';
process.env.DATABASE_URL =
  'postgresql://test:test@localhost:5432/amis_test?schema=public';
process.env.JWT_SECRET = 'test-secret-com-pelo-menos-32-caracteres-aqui!!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_unit_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.CORS_ORIGINS = 'http://localhost:8081';
