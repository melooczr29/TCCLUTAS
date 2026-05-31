/**
 * ============================================================================
 * Loading — Indicador de carregamento em tela cheia
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Mostra um spinner centralizado sobre o fundo escuro.
 * [POR QUE EXISTE]  Dar feedback enquanto a sessão/dados carregam.
 * [PARA QUE SERVE]  Evita telas em branco ou "piscando".
 * ============================================================================
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface LoadingProps {
  message?: string;
}

export function Loading({ message }: LoadingProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  message: { color: colors.textSecondary, ...typography.subtitle },
});
