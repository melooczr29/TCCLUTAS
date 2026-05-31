/**
 * ============================================================================
 * E2E Global Setup — sobe um PostgreSQL real (Testcontainers) e aplica o schema
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Inicia um container Postgres, cria o schema e guarda a URL.
 * [POR QUE EXISTE]  Os testes E2E precisam de um banco verdadeiro e isolado.
 * [PARA QUE SERVE]  Garantir que os fluxos críticos (alunos, professores e
 *                   pagamentos) funcionem com persistência real e descartável.
 * ============================================================================
 */

// [O QUE FAZ] Importa o container Postgres pronto da biblioteca Testcontainers.
// [POR QUE EXISTE] Abstrai o ciclo de vida do Docker (subir/derrubar) para nós.
// [PARA QUE SERVE] Permite criar um banco efêmero por execução de testes.
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

// [O QUE FAZ] Importa a função para executar comandos de shell de forma síncrona.
// [POR QUE EXISTE] Precisamos rodar o "prisma db push" para criar as tabelas.
// [PARA QUE SERVE] Sincroniza o schema.prisma com o banco recém-criado.
import { execSync } from 'node:child_process';

// [O QUE FAZ] Importa utilitários de escrita de arquivo.
// [POR QUE EXISTE] A URL do container precisa ser compartilhada com os workers.
// [PARA QUE SERVE] Persiste a connection string em disco para os testes lerem.
import { writeFileSync } from 'node:fs';

// [O QUE FAZ] Importa helper para montar caminhos de arquivo de forma segura.
// [POR QUE EXISTE] Garante o caminho correto independente do SO.
// [PARA QUE SERVE] Evita erros de path entre Windows/Linux (CI).
import { join } from 'node:path';

// [O QUE FAZ] Define onde a URL de conexão do container será gravada.
// [POR QUE EXISTE] globalSetup e os workers de teste são processos distintos.
// [PARA QUE SERVE] Serve como "ponte" para passar a URL ao env-e2e.ts.
const DB_URL_FILE = join(__dirname, '.testcontainer-url');

// [O QUE FAZ] Exporta a função padrão que o Jest chama no início da suíte.
// [POR QUE EXISTE] O Jest executa o globalSetup uma única vez, no boot.
// [PARA QUE SERVE] Centraliza toda a preparação do ambiente E2E.
export default async function globalSetup(): Promise<void> {
  // [O QUE FAZ] Cria e inicia um container Postgres 16 (imagem Alpine, leve).
  // [POR QUE EXISTE] Espelha a versão usada em produção (docker-compose).
  // [PARA QUE SERVE] Testa contra o mesmo motor de banco do ambiente real.
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:16-alpine')
    // [O QUE FAZ] Define o nome do banco de dados criado dentro do container.
    // [POR QUE EXISTE] Padroniza o database alvo dos testes.
    // [PARA QUE SERVE] Deixa a connection string previsível.
    .withDatabase('amis_e2e')
    // [O QUE FAZ] Define o usuário do banco.
    // [POR QUE EXISTE] Credenciais explícitas facilitam a depuração.
    // [PARA QUE SERVE] Compõe a URL de conexão usada pelo Prisma.
    .withUsername('amis_e2e')
    // [O QUE FAZ] Define a senha do banco.
    // [POR QUE EXISTE] São credenciais efêmeras e descartáveis (só em teste).
    // [PARA QUE SERVE] Completa a autenticação no banco de teste.
    .withPassword('amis_e2e')
    // [O QUE FAZ] Efetivamente baixa a imagem (se preciso) e sobe o container.
    // [POR QUE EXISTE] Sem start(), o banco não existe.
    // [PARA QUE SERVE] Disponibiliza um Postgres pronto para uso.
    .start();

  // [O QUE FAZ] Monta a connection string no formato que o Prisma entende.
  // [POR QUE EXISTE] getConnectionUri() já entrega host/porta dinâmicos do Docker.
  // [PARA QUE SERVE] Aponta o Prisma para o banco efêmero correto.
  const databaseUrl = `${container.getConnectionUri()}?schema=public`;

  // [O QUE FAZ] Grava a URL em disco para os workers de teste lerem depois.
  // [POR QUE EXISTE] Variáveis de ambiente do globalSetup não chegam aos workers.
  // [PARA QUE SERVE] É o canal de comunicação entre setup e testes.
  writeFileSync(DB_URL_FILE, databaseUrl, 'utf8');

  // [O QUE FAZ] Define a URL no ambiente do próprio processo de setup.
  // [POR QUE EXISTE] O comando "prisma db push" abaixo lê DATABASE_URL.
  // [PARA QUE SERVE] Permite criar as tabelas no banco recém-iniciado.
  process.env.DATABASE_URL = databaseUrl;

  // [O QUE FAZ] Aplica o schema.prisma no banco real (cria todas as tabelas).
  // [POR QUE EXISTE] O container nasce vazio; precisamos das tabelas do AMIS.
  // [PARA QUE SERVE] Deixa o banco pronto para os fluxos de teste E2E.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    // [O QUE FAZ] Injeta a DATABASE_URL do container no comando.
    // [POR QUE EXISTE] Garante que o push ocorra no banco efêmero, não no real.
    // [PARA QUE SERVE] Protege bancos de dev/prod de alterações acidentais.
    env: { ...process.env, DATABASE_URL: databaseUrl },
    // [O QUE FAZ] Encaminha a saída do comando para o terminal.
    // [POR QUE EXISTE] Facilita ver erros de migração na hora.
    // [PARA QUE SERVE] Acelera a depuração se algo falhar no schema.
    stdio: 'inherit',
  });

  // [O QUE FAZ] Guarda a referência do container numa variável global do Jest.
  // [POR QUE EXISTE] O globalTeardown precisa acessar o mesmo container.
  // [PARA QUE SERVE] Permite parar o container ao final da suíte.
  (globalThis as unknown as { __PG_CONTAINER__: StartedPostgreSqlContainer }).__PG_CONTAINER__ =
    container;
}
