/**
 * ============================================================================
 * http — Cliente HTTP central (Axios) do app AMIS
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Cria a instância Axios e anexa o token JWT automaticamente.
 * [POR QUE EXISTE]  Centralizar baseURL, timeout e tratamento de erro num lugar.
 * [PARA QUE SERVE]  Todas as telas chamam a API por aqui, de forma consistente.
 * ============================================================================
 */
import axios, { type AxiosInstance } from 'axios';
import { tokenStorage } from '../utils/storage';

// [O QUE FAZ] Lê a URL da API de uma variável pública do Expo (com fallback).
// [POR QUE EXISTE] Permite trocar o endereço sem alterar código.
// [PARA QUE SERVE] Aponta o app para o backend correto (local ou nuvem).
const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333/api';

// [O QUE FAZ] Cria a instância Axios com baseURL, timeout e header padrão.
// [POR QUE EXISTE] Reaproveitar a mesma config em todas as chamadas.
// [PARA QUE SERVE] Evita repetir configuração em cada requisição.
export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// [O QUE FAZ] Antes de cada requisição, injeta o token salvo (se houver).
// [POR QUE EXISTE] Rotas protegidas exigem "Authorization: Bearer <token>".
// [PARA QUE SERVE] Autentica o usuário sem repetir lógica nas telas.
http.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// [O QUE FAZ] Normaliza erros da API para uma mensagem amigável e curta.
// [POR QUE EXISTE] O backend nunca expõe detalhes internos; queremos texto claro.
// [PARA QUE SERVE] As telas mostram um aviso compreensível ao usuário.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data as { message?: string } | undefined;
    const message = data?.message ?? 'Não foi possível concluir a operação.';
    return Promise.reject(new Error(message));
  },
);
