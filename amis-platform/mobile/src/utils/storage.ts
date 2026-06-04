/**
 * ============================================================================
 * storage — Armazenamento de credenciais multiplataforma
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Salva/lê/limpa o token JWT do dispositivo.
 * [POR QUE EXISTE]  Manter a sessão entre aberturas do app, com segurança.
 * [PARA QUE SERVE]  Native: Keychain/Keystore cifrado (expo-secure-store).
 *                   Web (demo no navegador): localStorage (SecureStore não
 *                   existe na web). Em produção web usaríamos cookie httpOnly.
 * ============================================================================
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// [O QUE FAZ] Chave única usada para guardar o token.
// [POR QUE EXISTE] Padroniza o identificador do valor salvo.
// [PARA QUE SERVE] Ler/escrever sempre o mesmo registro.
const TOKEN_KEY = 'amis.auth.token';

// [O QUE FAZ] Detecta se estamos rodando no navegador (Expo web).
// [POR QUE EXISTE] SecureStore não funciona na web e lançaria erro.
// [PARA QUE SERVE] Escolher o mecanismo de armazenamento correto.
const isWeb = Platform.OS === 'web';

// [O QUE FAZ] Interface mínima do localStorage (evita depender da lib DOM no TS).
// [POR QUE EXISTE] O tsconfig do RN pode não incluir os tipos do DOM.
// [PARA QUE SERVE] Acessar o localStorage de forma tipada e portável.
interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// [O QUE FAZ] Recupera o localStorage do ambiente web (ou undefined).
// [POR QUE EXISTE] Centraliza o acesso seguro ao storage do navegador.
// [PARA QUE SERVE] Usado apenas quando isWeb é verdadeiro.
const webStorage = (globalThis as unknown as { localStorage?: WebStorageLike }).localStorage;

export const tokenStorage = {
  // [O QUE FAZ] Salva o token de forma segura (ou em localStorage na web).
  // [POR QUE EXISTE] Persistir a sessão após login/cadastro.
  // [PARA QUE SERVE] Reusar o token nas próximas requisições.
  async save(token: string): Promise<void> {
    if (isWeb) {
      webStorage?.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  // [O QUE FAZ] Lê o token salvo (ou null se não houver).
  // [POR QUE EXISTE] Restaurar a sessão e autenticar requisições.
  // [PARA QUE SERVE] Saber se o usuário continua logado.
  async get(): Promise<string | null> {
    if (isWeb) {
      return webStorage?.getItem(TOKEN_KEY) ?? null;
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  // [O QUE FAZ] Remove o token (logout / token inválido).
  // [POR QUE EXISTE] Encerrar a sessão com segurança.
  // [PARA QUE SERVE] Forçar novo login quando necessário.
  async clear(): Promise<void> {
    if (isWeb) {
      webStorage?.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
