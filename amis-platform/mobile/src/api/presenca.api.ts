/**
 * ============================================================================
 * presenca.api — Chamadas de presença
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Gerar QR (Sensei), registrar presença (Aluno) e listar histórico.
 * [POR QUE EXISTE]  Isola a comunicação de presença do resto do app.
 * [PARA QUE SERVE]  As telas de presença usam estas funções tipadas.
 * ============================================================================
 */
import { http } from './http';
import type { PresencaItem, QrPresenca } from './types';

// [O QUE FAZ] Pede ao backend o QR assinado da aula (rota de SENSEI/GESTOR).
// [POR QUE EXISTE] O token assinado é a defesa anti-fraude da presença.
// [PARA QUE SERVE] Gera o "código de presença" que o aluno usará.
export async function gerarQr(): Promise<QrPresenca> {
  const { data } = await http.post<{ data: QrPresenca }>('/presencas/qr');
  return data.data;
}

// [O QUE FAZ] Registra a presença do aluno autenticado.
// [POR QUE EXISTE] É o check-in efetivo na aula.
// [PARA QUE SERVE] Persiste a presença validando o QR no backend.
export async function registrarPresenca(input: {
  qrToken: string;
  senseiId: string;
  dataAula: string;
}): Promise<{ id: string; status: string; dataAula: string }> {
  const { data } = await http.post<{
    data: { id: string; status: string; dataAula: string };
  }>('/presencas', input);
  return data.data;
}

// [O QUE FAZ] Lista as presenças do aluno autenticado (paginado).
// [POR QUE EXISTE] Exibir o histórico de presenças.
// [PARA QUE SERVE] Alimenta a lista da tela de presença.
export async function listarPresencas(
  page = 1,
  limit = 20,
): Promise<{ items: PresencaItem[]; total: number }> {
  const { data } = await http.get<{
    data: { items: PresencaItem[]; total: number };
  }>('/presencas', { params: { page, limit } });
  return data.data;
}
