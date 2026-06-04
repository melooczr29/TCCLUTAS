/**
 * ============================================================================
 * Card — Cartão de superfície para agrupar conteúdo
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Caixa com fundo de superfície, cantos arredondados e padding.
 * [POR QUE EXISTE]  Destacar blocos (item de lista, formulário, info).
 * [PARA QUE SERVE]  Organiza visualmente as telas com hierarquia clara.
 * ============================================================================
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps): React.JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: spacing.xs,
  },
});
