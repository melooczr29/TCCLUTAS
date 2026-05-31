/**
 * ============================================================================
 * TextField — Campo de texto rotulado (tema escuro)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Renderiza um label + input estilizado, com erro opcional.
 * [POR QUE EXISTE]  Padronizar formulários (login, cadastro, pagamento).
 * [PARA QUE SERVE]  Inputs consistentes e acessíveis em todo o app.
 * ============================================================================
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  multiline?: boolean;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType,
  error,
  multiline,
}: TextFieldProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        multiline={multiline}
      />
      {/* [O QUE FAZ] Mostra a mensagem de erro abaixo do campo, se houver.
          [POR QUE EXISTE] Feedback claro de validação para o usuário.
          [PARA QUE SERVE] Orienta a correção sem confundir. */}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, ...typography.subtitle },
});
