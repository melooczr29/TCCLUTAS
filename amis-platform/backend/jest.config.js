/**
 * ============================================================================
 * Configuração do Jest — Testes UNITÁRIOS e de INTEGRAÇÃO (sem Docker)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Define como o Jest encontra e executa os testes rápidos.
 * [POR QUE EXISTE]  Separar testes rápidos (mock) dos testes E2E (Docker/DB
 *                   real) evita exigir Docker para a checagem do dia a dia.
 * [PARA QUE SERVE]  Garante um ciclo de feedback rápido e a geração do
 *                   relatório de cobertura usado no badge do README.
 * ============================================================================
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
// [O QUE FAZ] Exporta o objeto de configuração para o Jest consumir.
// [POR QUE EXISTE] O Jest lê este arquivo por convenção (jest.config.js).
// [PARA QUE SERVE] Centraliza toda a parametrização da suíte rápida.
module.exports = {
  // [O QUE FAZ] Usa o preset do ts-jest para entender TypeScript.
  // [POR QUE EXISTE] Nosso código-fonte e testes são escritos em .ts.
  // [PARA QUE SERVE] Permite rodar testes sem um passo de build manual.
  preset: 'ts-jest',

  // [O QUE FAZ] Define o ambiente de execução como Node.js.
  // [POR QUE EXISTE] É uma API backend; não há DOM/navegador envolvido.
  // [PARA QUE SERVE] Evita overhead de jsdom e reflete o runtime real.
  testEnvironment: 'node',

  // [O QUE FAZ] Limita a busca de testes às pastas src e tests.
  // [POR QUE EXISTE] Impede o Jest de varrer node_modules/dist.
  // [PARA QUE SERVE] Acelera a descoberta de testes e reduz ruído.
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // [O QUE FAZ] Considera teste qualquer arquivo terminado em .test.ts.
  // [POR QUE EXISTE] Convenção clara para nomear arquivos de teste.
  // [PARA QUE SERVE] Padroniza a identificação dos arquivos de teste.
  testMatch: ['**/*.test.ts'],

  // [O QUE FAZ] Ignora a pasta de testes E2E nesta configuração.
  // [POR QUE EXISTE] Os testes E2E exigem Docker (Testcontainers) e são lentos.
  // [PARA QUE SERVE] Mantém a suíte padrão rápida e sem dependência de Docker.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/e2e/'],

  // [O QUE FAZ] Executa este arquivo ANTES de importar qualquer módulo.
  // [POR QUE EXISTE] config/env.ts aborta o processo se faltar variável.
  // [PARA QUE SERVE] Injeta variáveis fake para os testes não falharem no boot.
  setupFiles: ['<rootDir>/tests/setup-env.ts'],

  // [O QUE FAZ] Limpa o histórico de chamadas dos mocks entre cada teste.
  // [POR QUE EXISTE] Evita que um teste contamine o estado do próximo.
  // [PARA QUE SERVE] Garante testes isolados e determinísticos.
  clearMocks: true,

  // [O QUE FAZ] Define de quais arquivos a cobertura deve ser medida.
  // [POR QUE EXISTE] server.ts/prisma só fazem sentido com infra real.
  // [PARA QUE SERVE] Foca a métrica na lógica de negócio testável.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/config/prisma.ts',
    '!src/types/**',
  ],

  // [O QUE FAZ] Define os formatos do relatório de cobertura.
  // [POR QUE EXISTE] json-summary alimenta o badge; text mostra no terminal.
  // [PARA QUE SERVE] Permite gerar o badge e ler a cobertura localmente/CI.
  coverageReporters: ['text', 'json-summary', 'lcov'],

  // [O QUE FAZ] Compila TypeScript usando o tsconfig de testes.
  // [POR QUE EXISTE] O tsconfig de testes inclui a pasta tests e relaxa regras.
  // [PARA QUE SERVE] Evita erros de "unused" em mocks e tipa os testes.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};
