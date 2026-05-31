/**
 * ============================================================================
 * RegisterScreen — Criar conta (Aluno ou Sensei)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Coleta dados, deixa escolher o perfil e cadastra via contexto.
 * [POR QUE EXISTE]  Onboarding de novos usuários.
 * [PARA QUE SERVE]  Cria a conta e já entra autenticado no app.
 * ============================================================================
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing, typography } from '../theme';
import type { Role } from '../api/types';
import type { ScreenProps } from '../navigation/types';

export function RegisterScreen({ route }: ScreenProps<'Register'>): React.JSX.Element {
  // [O QUE FAZ] Função de cadastro do contexto.
  // [POR QUE EXISTE] Centraliza a regra de criação de conta.
  // [PARA QUE SERVE] A tela apenas coleta e dispara.
  const { signUp } = useAuth();

  // [O QUE FAZ] Estados do formulário.
  // [POR QUE EXISTE] Controlar inputs e UI (erro/loading).
  // [PARA QUE SERVE] Validar e dar feedback.
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  // Perfil inicial: o que veio da tela anterior, senão ALUNO.
  const [role, setRole] = useState<Extract<Role, 'ALUNO' | 'SENSEI'>>(
    route.params?.role === 'SENSEI' ? 'SENSEI' : 'ALUNO',
  );
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // [O QUE FAZ] Valida minimamente e cadastra.
  // [POR QUE EXISTE] Evitar requisições inválidas e tratar erro.
  // [PARA QUE SERVE] Garante feedback claro ao usuário.
  const handleRegister = async (): Promise<void> => {
    setError(undefined);
    if (nome.trim().length < 3) return setError('Informe seu nome completo.');
    if (!email.includes('@')) return setError('Informe um e-mail válido.');
    if (senha.length < 8) return setError('A senha deve ter ao menos 8 caracteres.');

    try {
      setLoading(true);
      await signUp({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        role,
        telefone: telefone.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Criar conta" subtitle="Preencha seus dados para começar">
      {/* Seletor de perfil */}
      <Text style={styles.label}>Eu sou</Text>
      <View style={styles.roleRow}>
        {(['ALUNO', 'SENSEI'] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            style={[styles.roleChip, role === r && styles.roleChipActive]}
          >
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
              {r === 'ALUNO' ? 'Aluno' : 'Sensei'}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextField label="Nome completo" value={nome} onChangeText={setNome} autoCapitalize="words" />
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextField
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        placeholder="Mín. 8 caracteres, com maiúscula e número"
      />
      <TextField
        label="Telefone (opcional)"
        value={telefone}
        onChangeText={setTelefone}
        keyboardType="phone-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label="Cadastrar"
        onPress={handleRegister}
        loading={loading}
        style={styles.mt}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  roleChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(230,138,0,0.15)' },
  roleText: { color: colors.textSecondary, fontWeight: '700' },
  roleTextActive: { color: colors.primary },
  mt: { marginTop: spacing.sm },
  error: { color: colors.danger, ...typography.subtitle },
});
