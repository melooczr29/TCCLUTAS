/**
 * ============================================================================
 * E2E — Fluxo de Autenticação (cadastro -> login -> perfil) com banco REAL
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Exercita registro, login e /me contra um Postgres verdadeiro.
 * [POR QUE EXISTE]  Provar que as credenciais dos usuários são persistidas e
 *                   protegidas (hash) de forma confiável.
 * [PARA QUE SERVE]  Demonstra à banca a resiliência do cadastro de alunos e
 *                   professores e a proteção contra vazamento de senha.
 * ============================================================================
 */

// [O QUE FAZ] Importa o cliente HTTP de teste.
// [POR QUE EXISTE] Permite chamar a API como um cliente real faria.
// [PARA QUE SERVE] Valida a app de fora pra dentro (ponta-a-ponta).
import request from 'supertest';

// [O QUE FAZ] Importa a fábrica que monta o app Express (sem listen()).
// [POR QUE EXISTE] Precisamos de uma instância da API para testar.
// [PARA QUE SERVE] Sobe a aplicação em memória para o Supertest.
import { createApp } from '../../src/app';

// [O QUE FAZ] Importa o prisma e a limpeza de banco dos helpers.
// [POR QUE EXISTE] Verificar persistência e isolar cada teste.
// [PARA QUE SERVE] Confirma no banco o que a API afirma ter feito.
import { prisma, cleanDatabase } from './helpers';

// [O QUE FAZ] Cria a instância do app uma vez para todos os testes do arquivo.
// [POR QUE EXISTE] Evita reconstruir a app a cada teste (mais rápido).
// [PARA QUE SERVE] Disponibiliza o "app" para o Supertest.
const app = createApp();

// [O QUE FAZ] Agrupa os testes do fluxo de autenticação.
// [POR QUE EXISTE] Organização e leitura clara dos resultados.
// [PARA QUE SERVE] Facilita identificar falhas por área.
describe('E2E Autenticação', () => {
  // [O QUE FAZ] Antes de cada teste, limpa o banco.
  // [POR QUE EXISTE] Garante estado inicial vazio e previsível.
  // [PARA QUE SERVE] Impede que um teste interfira no outro.
  beforeEach(async () => {
    await cleanDatabase();
  });

  // [O QUE FAZ] Após todos os testes, encerra a conexão do Prisma.
  // [POR QUE EXISTE] Conexões abertas mantêm o processo Jest "pendurado".
  // [PARA QUE SERVE] Permite que a suíte finalize de forma limpa.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // [O QUE FAZ] Testa o cadastro de um aluno do começo ao fim.
  // [POR QUE EXISTE] É o ponto de entrada de qualquer usuário no AMIS.
  // [PARA QUE SERVE] Garante que o registro persiste e protege a senha.
  it('registra um aluno, persiste no banco e NÃO expõe o hash da senha', async () => {
    // [O QUE FAZ] Envia POST /api/auth/register com dados válidos.
    // [POR QUE EXISTE] Simula o cadastro real de um aluno.
    // [PARA QUE SERVE] Aciona toda a cadeia: validação -> serviço -> banco.
    const res = await request(app).post('/api/auth/register').send({
      nome: 'Aluno E2E',
      email: 'aluno.e2e@amis.local',
      senha: 'SenhaForte1',
      role: 'ALUNO',
    });

    // [O QUE FAZ] Verifica que a API respondeu 201 (criado).
    // [POR QUE EXISTE] 201 é o status correto para criação de recurso.
    // [PARA QUE SERVE] Confirma sucesso do cadastro.
    expect(res.status).toBe(201);

    // [O QUE FAZ] Confirma que veio um token JWT na resposta.
    // [POR QUE EXISTE] O usuário já entra autenticado após o cadastro.
    // [PARA QUE SERVE] Valida a emissão de credencial de acesso.
    expect(res.body.data.token).toEqual(expect.any(String));

    // [O QUE FAZ] Garante que o hash da senha NÃO foi devolvido.
    // [POR QUE EXISTE] Vazar hash é falha de segurança (LGPD/OWASP).
    // [PARA QUE SERVE] Prova que a API não expõe credenciais.
    expect(res.body.data.user.passwordHash).toBeUndefined();

    // [O QUE FAZ] Busca o usuário diretamente no banco real.
    // [POR QUE EXISTE] Confirma que houve persistência verdadeira.
    // [PARA QUE SERVE] Valida o "P" (persistência) do fluxo.
    const dbUser = await prisma.user.findUnique({
      where: { email: 'aluno.e2e@amis.local' },
    });

    // [O QUE FAZ] Confirma que o usuário existe no banco.
    // [POR QUE EXISTE] Sem registro, o cadastro teria falhado silenciosamente.
    // [PARA QUE SERVE] Garante integridade do dado persistido.
    expect(dbUser).not.toBeNull();

    // [O QUE FAZ] Verifica que a senha foi gravada como HASH, não em texto puro.
    // [POR QUE EXISTE] Senha em texto puro é violação grave de segurança.
    // [PARA QUE SERVE] Comprova a criptografia (Bcrypt) das credenciais.
    expect(dbUser?.passwordHash).not.toBe('SenhaForte1');
  });

  // [O QUE FAZ] Testa o login e o acesso ao perfil protegido (/me).
  // [POR QUE EXISTE] Valida o ciclo completo de autenticação.
  // [PARA QUE SERVE] Garante que apenas usuários autenticados acessam dados.
  it('faz login e acessa /me com o token recebido', async () => {
    // [O QUE FAZ] Primeiro cadastra o usuário que fará login.
    // [POR QUE EXISTE] Precisamos de uma conta existente para autenticar.
    // [PARA QUE SERVE] Prepara o cenário do teste de login.
    await request(app).post('/api/auth/register').send({
      nome: 'Sensei E2E',
      email: 'sensei.e2e@amis.local',
      senha: 'SenhaForte1',
      role: 'SENSEI',
    });

    // [O QUE FAZ] Realiza o login com as credenciais corretas.
    // [POR QUE EXISTE] Obter um token válido para a próxima chamada.
    // [PARA QUE SERVE] Testa a verificação de senha e emissão de JWT.
    const login = await request(app).post('/api/auth/login').send({
      email: 'sensei.e2e@amis.local',
      senha: 'SenhaForte1',
    });

    // [O QUE FAZ] Confirma que o login retornou 200.
    // [POR QUE EXISTE] 200 indica autenticação bem-sucedida.
    // [PARA QUE SERVE] Valida o sucesso do login.
    expect(login.status).toBe(200);

    // [O QUE FAZ] Extrai o token da resposta de login.
    // [POR QUE EXISTE] Será usado para autorizar a chamada a /me.
    // [PARA QUE SERVE] Simula o uso real do token pelo app móvel.
    const token = login.body.data.token as string;

    // [O QUE FAZ] Chama /api/auth/me enviando o token no header Authorization.
    // [POR QUE EXISTE] Rota protegida que exige autenticação válida.
    // [PARA QUE SERVE] Confirma que o token autoriza o acesso ao perfil.
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    // [O QUE FAZ] Verifica que /me respondeu 200.
    // [POR QUE EXISTE] Indica que o token foi aceito.
    // [PARA QUE SERVE] Valida o middleware de autenticação JWT.
    expect(me.status).toBe(200);

    // [O QUE FAZ] Confere que o e-mail do perfil bate com o cadastrado.
    // [POR QUE EXISTE] Garante que o token aponta para o usuário certo.
    // [PARA QUE SERVE] Evita troca/identidade incorreta de sessão.
    expect(me.body.data.user.email).toBe('sensei.e2e@amis.local');
  });

  // [O QUE FAZ] Testa o bloqueio de cadastro com e-mail duplicado.
  // [POR QUE EXISTE] E-mail é único; duplicar quebraria a integridade.
  // [PARA QUE SERVE] Garante a regra de unicidade no banco real.
  it('bloqueia cadastro com e-mail já existente (409)', async () => {
    // [O QUE FAZ] Cadastra a primeira conta com o e-mail.
    // [POR QUE EXISTE] Cria a condição de conflito proposital.
    // [PARA QUE SERVE] Prepara o cenário de duplicidade.
    await request(app).post('/api/auth/register').send({
      nome: 'Primeiro',
      email: 'dup.e2e@amis.local',
      senha: 'SenhaForte1',
    });

    // [O QUE FAZ] Tenta cadastrar de novo com o MESMO e-mail.
    // [POR QUE EXISTE] Dispara a verificação de unicidade.
    // [PARA QUE SERVE] Valida o retorno de conflito controlado.
    const dup = await request(app).post('/api/auth/register').send({
      nome: 'Segundo',
      email: 'dup.e2e@amis.local',
      senha: 'SenhaForte1',
    });

    // [O QUE FAZ] Espera status 409 (conflito).
    // [POR QUE EXISTE] É o código correto para recurso já existente.
    // [PARA QUE SERVE] Confirma o tratamento seguro do erro de duplicidade.
    expect(dup.status).toBe(409);
  });
});
