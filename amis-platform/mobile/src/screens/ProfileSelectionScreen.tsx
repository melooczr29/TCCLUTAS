/**
 * ============================================================================
 * ProfileSelectionScreen - Tela de Seleção de Perfil
 * ----------------------------------------------------------------------------
 * Primeira tela do app: o usuário escolhe entrar como Sensei ou Aluno, ou se
 * cadastrar como novo Sensei. Aplica a identidade visual AMIS:
 *   - Fundo escuro de alto contraste.
 *   - Dois botões principais grandes e arredondados (radius 25) em Laranja
 *     Ativo (#e68a00) com texto branco bold.
 *   - Botão secundário "Sou novo (SENSEI)" em estilo outline.
 *
 * ----------------------------------------------------------------------------
 * FLUXO SEGURO DE PAGAMENTO (referência de arquitetura - PCI-DSS)
 * ----------------------------------------------------------------------------
 * Embora esta tela seja a porta de entrada, documentamos aqui como o app trata
 * pagamentos de forma segura mais adiante no fluxo (ex.: tela de mensalidade):
 *
 *   1. O app chama o backend (`criarPagamento`) que cria um PaymentIntent na
 *      Stripe e retorna apenas o `client_secret`. O backend NUNCA vê o cartão.
 *
 *   2. Com o `client_secret`, o app inicializa a Payment Sheet nativa:
 *
 *        import { useStripe } from '@stripe/stripe-react-native';
 *        const { initPaymentSheet, presentPaymentSheet } = useStripe();
 *
 *        const { clientSecret } = await criarPagamento(userId, 149.9);
 *        await initPaymentSheet({
 *          merchantDisplayName: 'AMIS',
 *          paymentIntentClientSecret: clientSecret,
 *        });
 *        const { error } = await presentPaymentSheet();
 *
 *   3. A folha de pagamento (Payment Sheet) é renderizada pela SDK da Stripe.
 *      Os dados do cartão são coletados, criptografados e enviados DIRETO para
 *      a Stripe — nunca trafegam pelo nosso servidor nem ficam no dispositivo.
 *
 *   4. O status final do pagamento é confirmado pelo backend via WEBHOOK
 *      assinado da Stripe (fonte da verdade), não pela resposta do cliente.
 *
 * Resultado: o escopo PCI-DSS do AMIS é minimizado — delegamos a custódia do
 * cartão à Stripe, blindando o negócio contra vazamento de dados financeiros.
 * ============================================================================
 */
import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { OutlineButton } from '../components/OutlineButton';
import { colors, spacing, typography } from '../theme';

export type PerfilSelecionado = 'SENSEI' | 'ALUNO' | 'NOVO_SENSEI';

interface ProfileSelectionScreenProps {
  /** Callback acionado ao escolher um perfil. Integrável ao react-navigation. */
  onSelectProfile?: (perfil: PerfilSelecionado) => void;
}

export function ProfileSelectionScreen({
  onSelectProfile,
}: ProfileSelectionScreenProps): React.JSX.Element {
  const handleSelect = (perfil: PerfilSelecionado): void => {
    onSelectProfile?.(perfil);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Cabeçalho / Marca */}
        <View style={styles.header}>
          <Text style={styles.brand}>AMIS</Text>
          <Text style={styles.subtitle}>
            Gestão pedagógica para Judô e Jiu-Jitsu
          </Text>
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  brand: {
    color: colors.primary,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    ...typography.subtitle,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actions: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  spacedButton: {
    marginBottom: spacing.md,
  },
  footer: {
    marginBottom: spacing.lg,
  },
});

export default ProfileSelectionScreen;
