/**
 * ============================================================================
 * E2E Global Teardown — derruba o container e limpa artefatos
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Para o Postgres efêmero e remove o arquivo com a URL.
 * [POR QUE EXISTE]  Recursos de Docker precisam ser liberados após os testes.
 * [PARA QUE SERVE]  Evita containers/portas/arquivos órfãos na máquina e no CI.
 * ============================================================================
 */

// [O QUE FAZ] Importa o tipo do container iniciado (apenas para tipagem).
// [POR QUE EXISTE] Recuperamos o container salvo no globalThis pelo setup.
// [PARA QUE SERVE] Dá segurança de tipos ao chamar .stop().
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

// [O QUE FAZ] Importa utilitários para remover o arquivo de URL.
// [POR QUE EXISTE] O arquivo .testcontainer-url é temporário.
// [PARA QUE SERVE] Mantém o diretório de testes limpo entre execuções.
import { existsSync, rmSync } from 'node:fs';

// [O QUE FAZ] Recalcula o caminho do arquivo de URL (mesmo do setup).
// [POR QUE EXISTE] Precisamos apagar exatamente o arquivo criado no setup.
// [PARA QUE SERVE] Evita deixar lixo apontando para um banco já destruído.
import { join } from 'node:path';

// [O QUE FAZ] Caminho do arquivo temporário com a connection string.
// [POR QUE EXISTE] Deve coincidir com o definido no global-setup.ts.
// [PARA QUE SERVE] Localiza o arquivo a ser removido.
const DB_URL_FILE = join(__dirname, '.testcontainer-url');

// [O QUE FAZ] Exporta a função que o Jest chama ao final de toda a suíte.
// [POR QUE EXISTE] O Jest executa o globalTeardown uma única vez, no fim.
// [PARA QUE SERVE] Centraliza a limpeza do ambiente E2E.
export default async function globalTeardown(): Promise<void> {
  // [O QUE FAZ] Recupera a referência do container salva pelo setup.
  // [POR QUE EXISTE] É a mesma instância que precisamos parar.
  // [PARA QUE SERVE] Permite encerrar o Postgres efêmero corretamente.
  const container = (
    globalThis as unknown as { __PG_CONTAINER__?: StartedPostgreSqlContainer }
  ).__PG_CONTAINER__;

  // [O QUE FAZ] Se houver container, para-o (encerra o processo Docker).
  // [POR QUE EXISTE] Liberar memória, porta e o volume efêmero.
  // [PARA QUE SERVE] Garante que nada fique rodando após os testes.
  if (container) {
    await container.stop();
  }

  // [O QUE FAZ] Remove o arquivo temporário com a URL, se existir.
  // [POR QUE EXISTE] A URL aponta para um banco que não existe mais.
  // [PARA QUE SERVE] Evita confundir execuções futuras com URL inválida.
  if (existsSync(DB_URL_FILE)) {
    rmSync(DB_URL_FILE);
  }
}
