/**
 * ============================================================================
 * demo — Modo Demonstração (sem backend)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Fornece dados estáticos e aceita qualquer login/cadastro.
 * [POR QUE EXISTE]  Permitir navegar por TODAS as telas sem o backend ligado.
 * [PARA QUE SERVE]  Demonstração imediata no navegador (TCC/Figma).
 * ----------------------------------------------------------------------------
 * Ligado por padrão. Para usar o backend REAL, defina EXPO_PUBLIC_DEMO=0.
 * Dica: o PERFIL é inferido pelo e-mail digitado:
 *   contém "gestor" -> GESTOR | "sensei"/"prof" -> SENSEI | senão -> ALUNO
 * ============================================================================
 */
import type { AuthResult, PagamentoItem, PresencaItem, QrPresenca, Role, User } from './types';

// [O QUE FAZ] Liga/desliga o modo demo via variável de ambiente.
// [POR QUE EXISTE] Alternar entre demo e backend real sem mexer no código.
// [PARA QUE SERVE] Demo é o padrão; EXPO_PUBLIC_DEMO=0 usa a API real.
export const DEMO = process.env.EXPO_PUBLIC_DEMO !== '0';

// [O QUE FAZ] Descobre o perfil a partir do e-mail digitado.
// [POR QUE EXISTE] Deixa você testar os 3 dashboards trocando o e-mail.
// [PARA QUE SERVE] Ex.: "sensei@x.com" abre o painel do Sensei.
function roleFromEmail(email: string): Role {
  const e = email.toLowerCase();
  if (e.includes('gestor')) return 'GESTOR';
  if (e.includes('sensei') || e.includes('prof')) return 'SENSEI';
  return 'ALUNO';
}

// [O QUE FAZ] Cria um usuário fake coerente.
// [POR QUE EXISTE] As telas precisam de um objeto User válido.
// [PARA QUE SERVE] Preenche Home, badge de perfil, etc.
export function demoUser(email = 'demo@amis.local', role?: Role): User {
  // [O QUE FAZ] Resolve o papel final (param tem prioridade; senão vem do e-mail).
  // [POR QUE EXISTE] O nome e o badge precisam bater com o mesmo papel.
  // [PARA QUE SERVE] Evita "Olá, Aluno" quando o login é de Sensei/Gestor.
  const papel: Role = role ?? roleFromEmail(email);
  return {
    id: 'demo-user-id',
    nome: papel === 'SENSEI' ? 'Sensei Demo' : papel === 'GESTOR' ? 'Gestor Demo' : 'Aluno Demo',
    email,
    role: papel,
    telefone: null,
    ativo: true,
    stripeCustomerId: null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
}

// [O QUE FAZ] Resultado fake de login/cadastro (usuário + token).
// [POR QUE EXISTE] Aceitar qualquer credencial no modo demo.
// [PARA QUE SERVE] Entrar no app sem backend.
export function demoAuth(email: string, role?: Role): AuthResult {
  return { user: demoUser(email, role), token: 'demo-token' };
}

// [O QUE FAZ] QR/código de presença fake.
// [POR QUE EXISTE] Permitir testar a tela do Sensei.
// [PARA QUE SERVE] Gera um código copiável de demonstração.
export const demoQr: QrPresenca = {
  qrToken: 'DEMO.qr.token',
  senseiId: 'demo-sensei-id',
  dataAula: new Date().toISOString(),
};

// [O QUE FAZ] Histórico de presenças fake.
// [POR QUE EXISTE] Mostrar a lista preenchida na tela de Presença.
// [PARA QUE SERVE] Visualizar o layout com dados.
export const demoPresencas: PresencaItem[] = [
  {
    id: 'p1',
    status: 'PRESENTE',
    dataAula: new Date().toISOString(),
    observacao: null,
    sensei: { id: 'demo-sensei-id', nome: 'Sensei Demo' },
  },
];

// [O QUE FAZ] Pagamentos fake (um pago, um pendente).
// [POR QUE EXISTE] Mostrar status coloridos na tela de Pagamentos.
// [PARA QUE SERVE] Visualizar o histórico financeiro.
export const demoPagamentos: PagamentoItem[] = [
  {
    id: 'pg1',
    valor: '149.90',
    status: 'PAGO',
    descricao: 'Mensalidade Judô',
    gatewayRefId: 'pi_demo_1',
    dataCriacao: new Date().toISOString(),
  },
  {
    id: 'pg2',
    valor: '60.00',
    status: 'PENDENTE',
    descricao: 'Aula avulsa Jiu-Jitsu',
    gatewayRefId: null,
    dataCriacao: new Date().toISOString(),
  },
];
