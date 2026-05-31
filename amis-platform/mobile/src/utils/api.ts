/**
 * ============================================================================
 * api - Cliente HTTP (Axios) da Plataforma AMIS
 * ----------------------------------------------------------------------------
 * - baseURL vem de variável de ambiente pública (EXPO_PUBLIC_API_URL).
 * - Interceptor de request anexa automaticamente o JWT (Bearer) lido do
 *   armazenamento seguro do dispositivo.
 * - Interceptor de response normaliza o formato de erro retornado pela API
 *   (que nunca expõe detalhes internos) para uma mensagem amigável.
 * ============================================================================
 */
import axios, { type AxiosInstance } from 'axios';
import { tokenStorage } from './storage';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiError {
  status: 'error';
  code: string;
  message: string;
  details?: { campo: string; mensagem: string }[];
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data as ApiError | undefined;
    const message = data?.message ?? 'Não foi possível concluir a operação.';
    return Promise.reject(new Error(message));
  },
);

// ----------------------------------------------------------------------------
// Funções de API tipadas
// ----------------------------------------------------------------------------

export interface CreatePaymentResponse {
  status: 'success';
  data: { clientSecret: string; pagamentoId: string };
}

/** Solicita ao backend a criação de uma intenção de pagamento. */
export async function criarPagamento(
  userId: string,
  valor: number,
  descricao?: string,
): Promise<{ clientSecret: string; pagamentoId: string }> {
  const { data } = await api.post<CreatePaymentResponse>('/pagamentos/intent', {
    userId,
    valor,
    descricao,
  });
  return data.data;
}
