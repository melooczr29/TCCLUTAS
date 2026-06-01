/**
 * ============================================================================
 * pagamento.api — Chamadas de pagamento
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Criar cobrança (GESTOR) e listar pagamentos do usuário.
 * [POR QUE EXISTE]  Isola a comunicação financeira do resto do app.
 * [PARA QUE SERVE]  As telas de pagamento usam estas funções tipadas.
 * ============================================================================
 */
import { http } from './http';
import { DEMO, demoPagamentos } from './demo';
import type { PagamentoItem } from './types';

// [O QUE FAZ] Solicita ao backend a criação de uma intenção de pagamento.
// [POR QUE EXISTE] O backend cria o PaymentIntent na Stripe e devolve o segredo.
// [PARA QUE SERVE] O app usaria o client_secret na Payment Sheet (build nativo).
export async function criarCobranca(input: {
  userId: string;
  valor: number;
  descricao?: string;
}): Promise<{ clientSecret: string; pagamentoId: string }> {
  // [DEMO] Sem backend: simula intenção de pagamento criada.
  if (DEMO) return { clientSecret: 'demo_secret', pagamentoId: 'demo-pagamento' };
  const { data } = await http.post<{
    data: { clientSecret: string; pagamentoId: string };
  }>('/pagamentos/intent', input);
  return data.data;
}

// [O QUE FAZ] Lista os pagamentos do usuário autenticado.
// [POR QUE EXISTE] Exibir o histórico financeiro.
// [PARA QUE SERVE] Alimenta a lista da tela de pagamentos.
export async function listarPagamentos(): Promise<PagamentoItem[]> {
  // [DEMO] Sem backend: devolve pagamentos fake (1 pago, 1 pendente).
  if (DEMO) return demoPagamentos;
  const { data } = await http.get<{ data: { pagamentos: PagamentoItem[] } }>(
    '/pagamentos',
  );
  return data.data.pagamentos;
}
