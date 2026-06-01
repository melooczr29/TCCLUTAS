/**
 * ============================================================================
 * auth.api — Chamadas de autenticação
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Funções para cadastro, login e perfil (/me).
 * [POR QUE EXISTE]  Isola a comunicação de auth do resto do app.
 * [PARA QUE SERVE]  As telas e o AuthContext chamam estas funções tipadas.
 * ============================================================================
 */
import { http } from './http';
import { DEMO, demoAuth, demoUser } from './demo';
import type { AuthResult, Role, User } from './types';

// [O QUE FAZ] Envia o cadastro e retorna usuário + token.
// [POR QUE EXISTE] Criar conta de ALUNO ou SENSEI.
// [PARA QUE SERVE] Alimenta o fluxo de registro do app.
export async function register(input: {
  nome: string;
  email: string;
  senha: string;
  role?: Role;
  telefone?: string;
}): Promise<AuthResult> {
  // [DEMO] Sem backend: aceita qualquer cadastro e devolve usuário fake.
  if (DEMO) return demoAuth(input.email, input.role);
  const { data } = await http.post<{ data: AuthResult }>('/auth/register', input);
  return data.data;
}

// [O QUE FAZ] Faz login e retorna usuário + token.
// [POR QUE EXISTE] Autenticar um usuário existente.
// [PARA QUE SERVE] Alimenta o fluxo de login do app.
export async function login(input: {
  email: string;
  senha: string;
}): Promise<AuthResult> {
  // [DEMO] Sem backend: aceita qualquer e-mail/senha (perfil vem do e-mail).
  if (DEMO) return demoAuth(input.email);
  const { data } = await http.post<{ data: AuthResult }>('/auth/login', input);
  return data.data;
}

// [O QUE FAZ] Busca o perfil do usuário autenticado.
// [POR QUE EXISTE] Restaurar a sessão quando o app reabre com token salvo.
// [PARA QUE SERVE] Confirma que o token ainda é válido e quem é o usuário.
export async function getProfile(): Promise<User> {
  // [DEMO] Sem backend: devolve um usuário padrão para manter a sessão.
  if (DEMO) return demoUser();
  const { data } = await http.get<{ data: { user: User } }>('/auth/me');
  return data.data.user;
}
