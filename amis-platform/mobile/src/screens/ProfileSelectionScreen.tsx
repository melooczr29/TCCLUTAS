/**
 * ============================================================================
 * ProfileSelectionScreen — Tela de Seleção de Perfil (entrada do app)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Mostra a marca e 3 ações: Sensei, Aluno e "novo Sensei".
 * [POR QUE EXISTE]  É o primeiro contato; direciona o usuário ao fluxo certo.
 * [PARA QUE SERVE]  Encaminha para Login (com perfil) ou Cadastro de Sensei.
 *
 * Identidade visual: fundo escuro de alto contraste, botões grandes
 * arredondados (radius 25) em Laranja Ativo (#e68a00) e um outline secundário.
 * ============================================================================
 */
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { OutlineButton } from '../components/OutlineButton';
import { colors, spacing, typography } from '../theme';
import type { ScreenProps } from '../navigation/types';

// [O QUE FAZ] Perfis possíveis de escolha nesta tela.
// [POR QUE EXISTE] Tipar o destino da navegação.
// [PARA QUE SERVE] Evita valores inválidos de perfil.
export type PerfilSelecionado = 'SENSEI' | 'ALUNO' | 'NOVO_SENSEI';

export function ProfileSelectionScreen({
  navigation,
}: ScreenProps<'ProfileSelection'>): React.JSX.Element {
  // [O QUE FAZ] Encaminha cada escolha para a tela adequada.
  // [POR QUE EXISTE] Centralizar a lógica de navegação da tela.
  // [PARA QUE SERVE] Mantém os botões simples e legíveis.
  const handleSelect = (perfil: PerfilSelecionado): void => {
    if (perfil === 'NOVO_SENSEI') {
      navigation.navigate('Register', { role: 'SENSEI' });
      return;
    }
    navigation.navigate('Login', { role: perfil });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Cabeçalho / Marca */}
        <View style={styles.header}>
          <Text style={styles.brand}>AMIS</Text>
          <Text style={styles.subtitle}>Gestão pedagógica para Judô e Jiu-Jitsu</Text>
        </View>

        {/* Ações principais */}
        <View style={styles.actions}>
          <PrimaryButton
            label="Professor / Sensei"
            accessibilityHint="Entrar como professor ou sensei"
            onPress={() => handleSelect('SENSEI')}
            style={styles.spacedButton}
          />
          <PrimaryButton
            label="Sou Aluno"
            accessibilityHint="Entrar como aluno"
            onPress={() => handleSelect('ALUNO')}
          />
        </View>

        {/* Ação secundária */}
        <View style={styles.footer}>
          <OutlineButton
            label="Sou novo (SENSEI)"
            accessibilityHint="Criar um novo cadastro de sensei"
            onPress={() => handleSelect('NOVO_SENSEI')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  header: { alignItems: 'center', marginTop: spacing.xxl },
  brand: { color: colors.primary, fontSize: 48, fontWeight: '800', letterSpacing: 4 },
  subtitle: {
    color: colors.textSecondary,
    ...typography.subtitle,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actions: { flex: 1, justifyContent: 'center', gap: spacing.md },
  spacedButton: { marginBottom: spacing.md },
  footer: { marginBottom: spacing.lg },
});

export default ProfileSelectionScreen;
