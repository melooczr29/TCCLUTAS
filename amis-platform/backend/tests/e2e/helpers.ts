/**
 * ============================================================================
 * E2E Helpers — utilidades compartilhadas pelos testes ponta-a-ponta
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Expõe o cliente Prisma e uma função para limpar o banco.
 * [POR QUE EXISTE]  Cada teste deve começar de um estado limpo e previsível.
 * [PARA QUE SERVE]  Garante isolamento entre testes que usam o MESMO banco real.
 * ============================================================================
 */

// [O QUE FAZ] Importa o cliente Prisma singleton da aplicação.
// [POR QUE EXISTE] Reutilizar a mesma instância evita esgotar conexões.
// [PARA QUE SERVE] Permite consultar/limpar o banco real nos testes.
import { prisma } from '../../src/config/prisma';

// [O QUE FAZ] Reexporta o prisma para os arquivos de teste importarem daqui.
// [POR QUE EXISTE] Centraliza o acesso ao banco num único ponto.
// [PARA QUE SERVE] Mantém os imports dos testes curtos e consistentes.
export { prisma };

// [O QUE FAZ] Apaga TODOS os registros das tabelas, reiniciando o estado.
// [POR QUE EXISTE] Testes E2E não devem herdar dados uns dos outros.
// [PARA QUE SERVE] Assegura resultados determinísticos a cada execução.
export async function cleanDatabase(): Promise<void> {
  // [O QUE FAZ] Trunca as três tabelas em cascata, numa única instrução.
  // [POR QUE EXISTE] CASCADE respeita as foreign keys (presencas/pagamentos).
  // [PARA QUE SERVE] Limpa tudo sem violar integridade referencial.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "pagamentos", "presencas", "users" RESTART IDENTITY CASCADE;',
  );
}
