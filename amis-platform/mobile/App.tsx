/**
 * App raiz do AMIS Mobile.
 * Envolve a aplicação com o StripeProvider (usando a chave PUBLICÁVEL — segura
 * para o cliente) para habilitar a Payment Sheet nativa em qualquer tela.
 */
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import ProfileSelectionScreen, {
  type PerfilSelecionado,
} from './src/screens/ProfileSelectionScreen';

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function App(): React.JSX.Element {
  const handleSelectProfile = (perfil: PerfilSelecionado): void => {
    // Aqui, em produção, navegaríamos para o fluxo de login/cadastro adequado
    // (react-navigation) conforme o perfil escolhido.
    // eslint-disable-next-line no-console
    console.log('Perfil selecionado:', perfil);
  };

  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.amis"
      >
        <ProfileSelectionScreen onSelectProfile={handleSelectProfile} />
      </StripeProvider>
    </SafeAreaProvider>
  );
}
