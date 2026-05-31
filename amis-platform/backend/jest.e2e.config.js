/**
 * ============================================================================
 * Configuração do Jest — Testes E2E (banco PostgreSQL REAL via Testcontainers)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Configura uma suíte separada que sobe um Postgres real em Docker.
 * [POR QUE EXISTE]  Validar o sistema ponta-a-ponta (HTTP -> Prisma -> banco)
 *                   exige um banco verdadeiro, não mocks.
 * [PARA QUE SERVE]  Comprova à banca que cadastro, login, presença e RBAC
 *                   funcionam com persistência real, sem corromper dados.
 * ============================================================================
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
// [O QUE FAZ] Exporta a configuração específica de E2E.
// [POR QUE EXISTE] É carregada via "jest --config jest.e2e.config.js".
// [PARA QUE SERVE] Mantém E2E isolado da suíte rápida do dia a dia.
module.exports = {
  // [O QUE FAZ] Usa ts-jest para rodar testes em TypeScript.
  // [POR QUE EXISTE] Os testes E2E também são .ts.
  // [PARA QUE SERVE] Dispensa build manual antes de testar.
  preset: 'ts-jest',

  // [O QUE FAZ] Ambiente Node (sem navegador).
  // [POR QUE EXISTE] Estamos testando uma API HTTP.
  // [PARA QUE SERVE] Reflete o runtime de produção.
  testEnvironment: 'node',

  // [O QUE FAZ] Busca testes apenas dentro de tests/e2e.
  // [POR QUE EXISTE] Esta config é exclusiva para os testes E2E.
  // [PARA QUE SERVE] Evita rodar testes unitários aqui por engano.
  roots: ['<rootDir>/tests/e2e'],

  // [O QUE FAZ] Identifica arquivos terminados em .e2e.test.ts.
  // [POR QUE EXISTE] Nomeação explícita separa E2E dos demais testes.
  // [PARA QUE SERVE] Deixa claro o tipo de cada arquivo de teste.
  testMatch: ['**/*.e2e.test.ts'],

  // [O QUE FAZ] Roda UMA vez antes de toda a suíte: sobe o container.
  // [POR QUE EXISTE] Iniciar o Postgres uma única vez economiza tempo.
  // [PARA QUE SERVE] Disponibiliza o banco real para todos os testes E2E.
  globalSetup: '<rootDir>/tests/e2e/global-setup.ts',

  // [O QUE FAZ] Roda UMA vez ao final: derruba o container.
  // [POR QUE EXISTE] Liberar recursos do Docker após os testes.
  // [PARA QUE SERVE] Evita containers órfãos consumindo memória/porta.
  globalTeardown: '<rootDir>/tests/e2e/global-teardown.ts',

  // [O QUE FAZ] Roda em cada worker antes dos imports: define env + DATABASE_URL.
  // [POR QUE EXISTE] O PrismaClient lê DATABASE_URL na importação do módulo.
  // [PARA QUE SERVE] Garante que o Prisma aponte para o container correto.
  setupFiles: ['<rootDir>/tests/e2e/env-e2e.ts'],

  // [O QUE FAZ] Aumenta o timeout padrão para 60s.
  // [POR QUE EXISTE] Baixar a imagem e subir o Postgres pode demorar.
  // [PARA QUE SERVE] Evita falsos negativos por timeout na primeira execução.
  testTimeout: 60_000,

  // [O QUE FAZ] Compila os testes com o tsconfig de testes.
  // [POR QUE EXISTE] Inclui a pasta tests e relaxa regras de "unused".
  // [PARA QUE SERVE] Tipa os testes sem atritos de lint.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};
