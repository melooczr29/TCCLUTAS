/**
 * ============================================================================
 * types — Tipos compartilhados das respostas da API
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Declara os formatos de dados que o backend retorna.
 * [POR QUE EXISTE]  Tipagem forte evita erros e dá autocomplete nas telas.
 * [PARA QUE SERVE]  Garante que o front consuma a API com segurança de tipos.
 * ============================================================================
 */

// [O QUE FAZ] Define os papéis possíveis de um usuário.
// [POR QUE EXISTE] As telas mudam conforme o papel (RBAC no front).
// [PARA QUE SERVE] Controla o que cada perfil vê e pode fazer.
export type Role = 'ALUNO' | 'SENSEI' | 'GESTOR';

// [O QUE FAZ] Representa o usuário autenticado (sem dados sensíveis).
// [POR QUE EXISTE] É o objeto exibido no app após login.
// [PARA QUE SERVE] Mostra nome/e-mail/perfil e direciona o fluxo.
export interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  telefone: string | null;
  ativo: boolean;
  stripeCustomerId: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

// [O QUE FAZ] Resposta padrão de autenticação (cadastro/login).
// [POR QUE EXISTE] Backend retorna usuário + token juntos.
// [PARA QUE SERVE] Permite salvar token e exibir o usuário de uma vez.
export interface AuthResult {
  user: User;
  token: string;
}

// [O QUE FAZ] Item de presença retornado na listagem do aluno.
// [POR QUE EXISTE] Exibir o histórico de presenças.
// [PARA QUE SERVE] Alimenta a lista da tela de presença.
export interface PresencaItem {
  id: string;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADO';
  dataAula: string;
  observacao: string | null;
  sensei: { id: string; nome: string };
}

// [O QUE FAZ] Dados do QR de presença gerado pelo Sensei.
// [POR QUE EXISTE] O aluno precisa de token + senseiId + dataAula para o check-in.
// [PARA QUE SERVE] É o "código de presença" da aula.
export interface QrPresenca {
  qrToken: string;
  senseiId: string;
  dataAula: string;
}

// [O QUE FAZ] Item de pagamento retornado na listagem.
// [POR QUE EXISTE] Exibir o histórico financeiro do usuário.
// [PARA QUE SERVE] Alimenta a lista da tela de pagamentos.
export interface PagamentoItem {
  id: string;
  valor: string;
  status: 'PENDENTE' | 'PAGO' | 'FALHOU';
  descricao: string | null;
  gatewayRefId: string | null;
  dataCriacao: string;
}
