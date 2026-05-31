/**
 * ============================================================================
 * E2E Env Setup — injeta variáveis e a DATABASE_URL real ANTES dos imports
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Define segredos fake e a URL do container antes de tudo carregar.
 * [POR QUE EXISTE]  config/env.ts (fail-fast) e o PrismaClient leem env no boot.
 * [PARA QUE SERVE]  Garantir que a app E2E conecte no Postgres do Testcontainers.
 * ============================================================================
 */

// [O QUE FAZ] Importa leitura síncrona de arquivo e checagem de existência.
// [POR QUE EXISTE] A URL do banco foi gravada em disco pelo global-setup.
// [PARA QUE SERVE] Recupera a connection string do container nesta etapa.
import { existsSync, readFileSync } from 'node:fs';

// [O QUE FAZ] Importa helper de caminho para localizar o arquivo de URL.
// [POR QUE EXISTE] O arquivo fica na mesma pasta deste setup.
// [PARA QUE SERVE] Monta o caminho correto em qualquer SO.
import { join } from 'node:path';

// [O QUE FAZ] Define o ambiente como "test".
// [POR QUE EXISTE] Ativa caminhos seguros (ex.: logs reduzidos) na app.
// [PARA QUE SERVE] Comporta-se como ambiente de teste, não de produção.
process.env.NODE_ENV = 'test';

// [O QUE FAZ] Define a porta (não é usada de fato, pois não chamamos listen()).
// [POR QUE EXISTE] config/env.ts valida a presença/formato da porta.
// [PARA QUE SERVE] Satisfaz o schema de env sem abrir porta real.
process.env.PORT = '3333';

// [O QUE FAZ] Define um segredo JWT com 32+ caracteres.
// [POR QUE EXISTE] O schema exige no mínimo 32 chars (segurança).
// [PARA QUE SERVE] Permite assinar/verificar tokens reais nos testes.
process.env.JWT_SECRET = 'e2e-secret-com-pelo-menos-32-caracteres-aqui!!';

// [O QUE FAZ] Define a validade do token de teste.
// [POR QUE EXISTE] O fluxo de login emite um JWT com expiração.
// [PARA QUE SERVE] Testa autenticação ponta-a-ponta.
process.env.JWT_EXPIRES_IN = '1h';

// [O QUE FAZ] Define uma chave Stripe FAKE.
// [POR QUE EXISTE] config/stripe.ts exige a variável para instanciar o SDK.
// [PARA QUE SERVE] Permite carregar a app sem chamar a Stripe de verdade.
process.env.STRIPE_SECRET_KEY = 'sk_test_e2e_fake';

// [O QUE FAZ] Define as origens CORS permitidas no teste.
// [POR QUE EXISTE] O middleware de CORS valida a origem.
// [PARA QUE SERVE] Evita bloqueios de CORS durante os testes.
process.env.CORS_ORIGINS = 'http://localhost:8081';

// [O QUE FAZ] Caminho do arquivo onde o global-setup gravou a URL do banco.
// [POR QUE EXISTE] Precisamos ler a connection string dinâmica do container.
// [PARA QUE SERVE] Conecta o Prisma ao Postgres efêmero correto.
const DB_URL_FILE = join(__dirname, '.testcontainer-url');

// [O QUE FAZ] Se o arquivo existir, lê a URL e injeta em DATABASE_URL.
// [POR QUE EXISTE] O PrismaClient resolve DATABASE_URL ao ser importado.
// [PARA QUE SERVE] Garante persistência real apontando para o container.
if (existsSync(DB_URL_FILE)) {
  process.env.DATABASE_URL = readFileSync(DB_URL_FILE, 'utf8').trim();
}
