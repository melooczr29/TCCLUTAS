/**
 * ============================================================================
 * AuthContext — Estado global de autenticação
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Guarda o usuário/token e expõe signIn/signUp/signOut.
 * [POR QUE EXISTE]  Várias telas precisam saber se há login e quem é o usuário.
 * [PARA QUE SERVE]  Centraliza a sessão e decide qual fluxo (auth/app) exibir.
 * ============================================================================
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { login as apiLogin, register as apiRegister, getProfile } from '../api/auth.api';
import type { Role, User } from '../api/types';
import { tokenStorage } from '../utils/storage';

// [O QUE FAZ] Define o formato do contexto exposto às telas.
// [POR QUE EXISTE] Tipar o que está disponível via useAuth().
// [PARA QUE SERVE] Dá autocomplete e segurança de tipos.
interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signUp: (input: {
    nome: string;
    email: string;
    senha: string;
    role?: Role;
    telefone?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

// [O QUE FAZ] Cria o contexto (inicialmente indefinido).
// [POR QUE EXISTE] Será preenchido pelo Provider.
// [PARA QUE SERVE] Base para o hook useAuth().
const AuthContext = createContext<AuthContextData | undefined>(undefined);

// [O QUE FAZ] Provider que embrulha o app e mantém o estado de sessão.
// [POR QUE EXISTE] Compartilhar a sessão com toda a árvore de componentes.
// [PARA QUE SERVE] Permite login/logout reativos em qualquer tela.
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  // [O QUE FAZ] Estado do usuário logado (ou nulo).
  // [POR QUE EXISTE] As telas reagem à presença/ausência de usuário.
  // [PARA QUE SERVE] Decide o fluxo exibido.
  const [user, setUser] = useState<User | null>(null);

  // [O QUE FAZ] Estado de carregamento (restaurando sessão).
  // [POR QUE EXISTE] Evita "piscar" telas antes de saber se há login.
  // [PARA QUE SERVE] Mostra um loading no boot.
  const [loading, setLoading] = useState<boolean>(true);

  // [O QUE FAZ] Ao montar, tenta restaurar a sessão usando o token salvo.
  // [POR QUE EXISTE] Manter o usuário logado entre aberturas do app.
  // [PARA QUE SERVE] Boa experiência: não pede login toda vez.
  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStorage.get();
        if (token) {
          // Token existe: valida buscando o perfil no backend.
          const profile = await getProfile();
          setUser(profile);
        }
      } catch {
        // Token inválido/expirado: limpa para forçar novo login.
        await tokenStorage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // [O QUE FAZ] Realiza login, salva o token e define o usuário.
  // [POR QUE EXISTE] Fluxo de entrada de usuário existente.
  // [PARA QUE SERVE] Autentica e troca para o fluxo do app.
  const signIn = useCallback(async (email: string, senha: string) => {
    const result = await apiLogin({ email, senha });
    await tokenStorage.save(result.token);
    setUser(result.user);
  }, []);

  // [O QUE FAZ] Realiza cadastro, salva o token e define o usuário.
  // [POR QUE EXISTE] Fluxo de criação de conta.
  // [PARA QUE SERVE] Registra e já entra autenticado.
  const signUp = useCallback(
    async (input: { nome: string; email: string; senha: string; role?: Role; telefone?: string }) => {
      const result = await apiRegister(input);
      await tokenStorage.save(result.token);
      setUser(result.user);
    },
    [],
  );

  // [O QUE FAZ] Encerra a sessão: limpa token e usuário.
  // [POR QUE EXISTE] Permitir sair com segurança.
  // [PARA QUE SERVE] Volta para o fluxo de login.
  const signOut = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
  }, []);

  // [O QUE FAZ] Memoriza o valor do contexto para evitar re-renders.
  // [POR QUE EXISTE] Performance: só muda quando as dependências mudam.
  // [PARA QUE SERVE] Mantém o app fluido.
  const value = useMemo<AuthContextData>(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// [O QUE FAZ] Hook para consumir o contexto com checagem de uso correto.
// [POR QUE EXISTE] Evitar usar o contexto fora do Provider por engano.
// [PARA QUE SERVE] As telas chamam useAuth() de forma segura.
export function useAuth(): AuthContextData {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}
