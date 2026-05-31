/**
 * ============================================================================
 * storage - Armazenamento seguro de credenciais no dispositivo
 * ----------------------------------------------------------------------------
 * Usa `expo-secure-store`, que persiste no Keychain (iOS) / Keystore (Android),
 * cifrado pelo sistema operacional. NUNCA guardamos o token JWT em
 * AsyncStorage (texto puro) — boa prática de segurança móvel (OWASP MASVS).
 * ============================================================================
 */
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'amis.auth.token';

export const tokenStorage = {
  async save(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  get(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
