/**
 * ============================================================================
 * LoginScreen — Entrar na conta
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Coleta e-mail/senha e autentica via AuthContext.
 * [POR QUE EXISTE]  Acesso de usuários já cadastrados.
 * [PARA QUE SERVE]  Ao logar, o RootNavigator troca para o fluxo do app.
 * ============================================================================
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { OutlineButton } from '../components/OutlineButton';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography } from '../theme';
import type { ScreenProps } from '../navigation/types';

export function LoginScreen({ navigation, route }: ScreenProps<'Login'>): React.JSX.Element {
  // [O QUE FAZ] Função de login vinda do contexto.
  // [POR QUE EXISTE] Centraliza a regra de autenticação.
  // [PARA QUE SERVE] A tela só dispara; o estado é global.
  const { signIn } = useAuth();

  // [O QUE FAZ] Perfil sugerido (apenas informativo) vindo da tela anterior.
  // [POR QUE EXISTE] Dar contexto visual de qual perfil está entrando.
  // [PARA QUE SERVE] Texto de apoio; o perfil real vem do backend.
  const roleHint = route.params?.role;

  // [O QUE FAZ] Estados dos campos e de UI (erro/loading).
  // [POR QUE EXISTE] Controlar o formulário de forma reativa.
  // [PARA QUE SERVE] Validar e dar feedback ao usuário.
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // [O QUE FAZ] Tenta autenticar; trata erro e loading.
  // [POR QUE EXISTE] Encapsular o fluxo de submit.
  // [PARA QUE SERVE] Evita múltiplos cliques e mostra erro claro.
  const handleLogin = async (): Promise<void> => {
    setError(undefined);
    if (!email.trim() || !senha) {
      setError('Preencha e-mail e senha.');
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), senha);
      // Sucesso: o RootNavigator detecta o usuário e troca de stack sozinho.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Entrar" subtitle={roleHint ? `Acesso como ${roleHint}` : 'Bem-vindo de volta'}>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
      />
      <TextField
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        placeholder="Sua senha"
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="Entrar" onPress={handleLogin} loading={loading} style={styles.mt} />

      <Text style={styles.helper}>Ainda não tem conta?</Text>
      <OutlineButton
        label="Criar conta"
        onPress={() => navigation.navigate('Register', { role: roleHint })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mt: { marginTop: spacing.sm },
  helper: { color: colors.textSecondary, ...typography.subtitle, textAlign: 'center', marginTop: spacing.md },
  error: { color: colors.danger, ...typography.subtitle },
});
