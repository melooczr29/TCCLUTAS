/**
 * ============================================================================
 * E2E — Presença com QR assinado + RBAC, contra banco REAL
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Sensei gera o QR da aula; aluno registra presença; testa RBAC.
 * [POR QUE EXISTE]  A presença é o dado pedagógico central e deve ser à prova
 *                   de fraude e de acesso indevido.
 * [PARA QUE SERVE]  Comprova à banca a resiliência e a segurança do check-in.
 * ============================================================================
 */

// [O QUE FAZ] Importa o cliente HTTP de teste.
// [POR QUE EXISTE] Para chamar os endpoints como um app real.
// [PARA QUE SERVE] Testa o fluxo ponta-a-ponta.
import request from 'supertest';

// [O QUE FAZ] Importa a fábrica do app Express.
// [POR QUE EXISTE] Precisamos de uma instância da API.
// [PARA QUE SERVE] Sobe a app em memória para o Supertest.
import { createApp } from '../../src/app';

// [O QUE FAZ] Importa prisma e limpeza de banco.
// [POR QUE EXISTE] Conferir persistência e isolar testes.
// [PARA QUE SERVE] Garante estado limpo e validação no banco.
import { prisma, cleanDatabase } from './helpers';

// [O QUE FAZ] Cria a app uma vez para o arquivo.
// [POR QUE EXISTE] Reaproveitamento e performance.
// [PARA QUE SERVE] Disponibiliza o "app" aos testes.
const app = createApp();

// [O QUE FAZ] Função utilitária que cadastra um usuário e devolve token + id.
// [POR QUE EXISTE] Vários testes precisam de usuários prontos com papel.
// [PARA QUE SERVE] Reduz repetição e deixa os testes legíveis.
async function criarUsuario(
  nome: string,
  email: string,
  role: 'ALUNO' | 'SENSEI',
): Promise<{ token: string; id: string }> {
  // [O QUE FAZ] Cadastra o usuário via API.
  // [POR QUE EXISTE] Usar o fluxo real garante consistência dos dados.
  // [PARA QUE SERVE] Cria a conta e já recebe o token de acesso.
  const res = await request(app)
    .post('/api/auth/register')
    .send({ nome, email, senha: 'SenhaForte1', role });

  // [O QUE FAZ] Retorna o token e o id do usuário recém-criado.
  // [POR QUE EXISTE] São necessários para autorizar e relacionar registros.
  // [PARA QUE SERVE] Alimenta os próximos passos do teste.
  return { token: res.body.data.token, id: res.body.data.user.id };
}

// [O QUE FAZ] Agrupa os testes de presença.
// [POR QUE EXISTE] Organização por domínio funcional.
// [PARA QUE SERVE] Facilita a leitura dos resultados.
describe('E2E Presença (QR assinado + RBAC)', () => {
  // [O QUE FAZ] Limpa o banco antes de cada teste.
  // [POR QUE EXISTE] Estado inicial previsível.
  // [PARA QUE SERVE] Isolamento entre testes.
  beforeEach(async () => {
    await cleanDatabase();
  });

  // [O QUE FAZ] Encerra a conexão ao final.
  // [POR QUE EXISTE] Evita o processo Jest ficar pendurado.
  // [PARA QUE SERVE] Finalização limpa da suíte.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // [O QUE FAZ] Testa o caminho feliz: sensei gera QR, aluno registra presença.
  // [POR QUE EXISTE] É o fluxo principal de uso em aula.
  // [PARA QUE SERVE] Garante que o check-in funciona e persiste.
  it('sensei gera QR e aluno registra presença (persistida no banco)', async () => {
    // [O QUE FAZ] Cria um sensei e um aluno.
    // [POR QUE EXISTE] A presença relaciona aluno e sensei.
    // [PARA QUE SERVE] Prepara os atores do fluxo.
    const sensei = await criarUsuario('Sensei', 'sensei.p@amis.local', 'SENSEI');
    const aluno = await criarUsuario('Aluno', 'aluno.p@amis.local', 'ALUNO');

    // [O QUE FAZ] Sensei gera o QR Code assinado da aula.
    // [POR QUE EXISTE] O token assinado é a defesa anti-fraude.
    // [PARA QUE SERVE] Produz o qrToken/senseiId/dataAula da aula.
    const qr = await request(app)
      .post('/api/presencas/qr')
      .set('Authorization', `Bearer ${sensei.token}`);

    // [O QUE FAZ] Confirma que o QR foi gerado (201).
    // [POR QUE EXISTE] Sem o QR, o aluno não consegue registrar presença.
    // [PARA QUE SERVE] Valida a etapa do professor.
    expect(qr.status).toBe(201);

    // [O QUE FAZ] Aluno registra a presença usando o QR do sensei.
    // [POR QUE EXISTE] Simula o escaneamento do QR em sala.
    // [PARA QUE SERVE] Aciona a validação do token e a gravação.
    const presenca = await request(app)
      .post('/api/presencas')
      .set('Authorization', `Bearer ${aluno.token}`)
      .send({
        qrToken: qr.body.data.qrToken,
        senseiId: qr.body.data.senseiId,
        dataAula: qr.body.data.dataAula,
      });

    // [O QUE FAZ] Confirma que a presença foi criada (201).
    // [POR QUE EXISTE] Indica sucesso do check-in.
    // [PARA QUE SERVE] Valida o fluxo principal.
    expect(presenca.status).toBe(201);

    // [O QUE FAZ] Verifica no banco que existe 1 presença para o aluno.
    // [POR QUE EXISTE] Confirma a persistência real do registro.
    // [PARA QUE SERVE] Garante confiabilidade do dado de presença.
    const count = await prisma.presenca.count({ where: { alunoId: aluno.id } });
    expect(count).toBe(1);
  });

  // [O QUE FAZ] Garante que presença duplicada na mesma aula é bloqueada.
  // [POR QUE EXISTE] A regra @@unique(alunoId, dataAula) impede fraude/erro.
  // [PARA QUE SERVE] Protege a integridade do histórico de presenças.
  it('bloqueia presença duplicada para a mesma aula (409)', async () => {
    // [O QUE FAZ] Cria sensei e aluno.
    // [POR QUE EXISTE] Atores necessários ao fluxo.
    // [PARA QUE SERVE] Prepara o cenário.
    const sensei = await criarUsuario('Sensei2', 'sensei2.p@amis.local', 'SENSEI');
    const aluno = await criarUsuario('Aluno2', 'aluno2.p@amis.local', 'ALUNO');

    // [O QUE FAZ] Gera o QR da aula.
    // [POR QUE EXISTE] Necessário para registrar presença.
    // [PARA QUE SERVE] Fornece o token válido.
    const qr = await request(app)
      .post('/api/presencas/qr')
      .set('Authorization', `Bearer ${sensei.token}`);

    // [O QUE FAZ] Monta o corpo de presença reutilizável.
    // [POR QUE EXISTE] Vamos enviá-lo duas vezes (mesma aula/data).
    // [PARA QUE SERVE] Recria exatamente a condição de duplicidade.
    const body = {
      qrToken: qr.body.data.qrToken,
      senseiId: qr.body.data.senseiId,
      dataAula: qr.body.data.dataAula,
    };

    // [O QUE FAZ] Primeiro registro de presença (deve passar).
    // [POR QUE EXISTE] Cria o registro inicial válido.
    // [PARA QUE SERVE] Estabelece a presença existente.
    await request(app)
      .post('/api/presencas')
      .set('Authorization', `Bearer ${aluno.token}`)
      .send(body);

    // [O QUE FAZ] Segundo registro idêntico (deve falhar).
    // [POR QUE EXISTE] Dispara o conflito de unicidade.
    // [PARA QUE SERVE] Valida o bloqueio anti-duplicidade.
    const dup = await request(app)
      .post('/api/presencas')
      .set('Authorization', `Bearer ${aluno.token}`)
      .send(body);

    // [O QUE FAZ] Espera status 409 (conflito).
    // [POR QUE EXISTE] É o retorno correto para presença já existente.
    // [PARA QUE SERVE] Confirma a proteção da regra de negócio.
    expect(dup.status).toBe(409);
  });

  // [O QUE FAZ] Garante que um ALUNO não pode gerar QR (somente SENSEI/GESTOR).
  // [POR QUE EXISTE] RBAC protege funções sensíveis de papéis indevidos.
  // [PARA QUE SERVE] Demonstra o controle de acesso baseado em papel.
  it('impede ALUNO de gerar QR de presença (403 - RBAC)', async () => {
    // [O QUE FAZ] Cria um aluno comum.
    // [POR QUE EXISTE] É o papel que NÃO deve gerar QR.
    // [PARA QUE SERVE] Prepara o teste de autorização.
    const aluno = await criarUsuario('AlunoRbac', 'aluno.rbac@amis.local', 'ALUNO');

    // [O QUE FAZ] Aluno tenta gerar o QR (ação restrita).
    // [POR QUE EXISTE] Exercita a barreira de RBAC.
    // [PARA QUE SERVE] Verifica se o acesso é negado.
    const res = await request(app)
      .post('/api/presencas/qr')
      .set('Authorization', `Bearer ${aluno.token}`);

    // [O QUE FAZ] Espera status 403 (proibido).
    // [POR QUE EXISTE] 403 indica autenticado, porém sem permissão.
    // [PARA QUE SERVE] Confirma o bloqueio por papel (RBAC).
    expect(res.status).toBe(403);
  });
});
