/**
 * ============================================================================
 * Identidade Visual AMIS (Design Tokens)
 * ----------------------------------------------------------------------------
 * Centraliza cores, espaçamentos, raios e tipografia. Centralizar tokens
 * garante consistência visual e facilita ajustes de marca em um único lugar.
 * Paleta institucional: fundo escuro de alto contraste + Laranja Ativo.
 * ============================================================================
 */

export const colors = {
  /** Laranja Ativo (cor primária da marca). */
  primary: '#e68a00',
  primaryPressed: '#cc7a00',

  /** Fundo escuro/neutro de alto contraste. */
  background: '#121212',
  surface: '#1E1E1E',

  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textOnPrimary: '#FFFFFF',

  border: '#e68a00',
  danger: '#E5484D',
  success: '#2E9E5B',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 16,
  /** Raio dos botões principais solicitado na identidade (border-radius: 25). */
  pill: 25,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '400' as const },
  button: { fontSize: 18, fontWeight: '700' as const },
} as const;

export const theme = { colors, spacing, radii, typography } as const;
export type Theme = typeof theme;
