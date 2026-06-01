/**
 * ============================================================================
 * Screen — Contêiner base de tela (fundo escuro + área segura + scroll)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Padroniza o layout de fundo, padding e rolagem das telas.
 * [POR QUE EXISTE]  Evitar repetir SafeArea/cores/scroll em cada tela.
 * [PARA QUE SERVE]  Mantém a identidade visual consistente em todo o app.
 * ============================================================================
 */
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  scroll?: boolean;
}

export function Screen({
  children,
  title,
  subtitle,
  scroll = true,
}: ScreenProps): React.JSX.Element {
  // [O QUE FAZ] Conteúdo interno (título opcional + filhos).
  // [POR QUE EXISTE] Reutilizado tanto na versão com scroll quanto sem.
  // [PARA QUE SERVE] Evita duplicar a marcação.
  const content = (
    <View style={styles.inner}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {/* [O QUE FAZ] Empurra o conteúdo para cima quando o teclado abre.
          [POR QUE EXISTE] Em formulários, o teclado cobriria os campos.
          [PARA QUE SERVE] Mantém os inputs visíveis no iOS/Android. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* [O QUE FAZ] Envolve o conteúdo limitando a largura no web.
                [POR QUE EXISTE] Em telas largas o layout esticaria demais.
                [PARA QUE SERVE] Aparência tipo celular (coluna centralizada). */}
            <View style={styles.constrain}>{content}</View>
          </ScrollView>
        ) : (
          <View style={styles.constrain}>{content}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  constrain: { width: '100%', maxWidth: 480, flex: 1 },
  inner: { flex: 1, padding: spacing.lg, gap: spacing.md },
  title: { color: colors.textPrimary, ...typography.title, marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, ...typography.subtitle, marginBottom: spacing.sm },
});
