/**
 * ============================================================================
 * App — Raiz do AMIS Mobile
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Monta os provedores globais (área segura, sessão, navegação).
 * [POR QUE EXISTE]  Toda a árvore precisa de contexto de auth e navegação.
 * [PARA QUE SERVE]  Conecta tudo: a sessão decide quais telas aparecem.
 *
 * NOTA (Stripe): a Payment Sheet usa `@stripe/stripe-react-native` (módulo
 * NATIVO). Por isso o StripeProvider não é montado na raiz — ele é aplicado
 * na tela de pagamento no build nativo. Assim o app roda também no navegador.
 * ============================================================================
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

// [O QUE FAZ] Tema de navegação com a paleta escura do AMIS.
// [POR QUE EXISTE] Evitar o fundo branco padrão do react-navigation.
// [PARA QUE SERVE] Mantém a identidade visual em todas as transições.
const navTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: '#2A2A2A',
    notification: colors.primary,
  },
};

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
