/**
 * ============================================================================
 * RootNavigator — Decide o fluxo (não logado x logado)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Mostra o loading no boot e troca entre stack de auth e de app.
 * [POR QUE EXISTE]  Separar telas públicas das protegidas.
 * [PARA QUE SERVE]  Garante que só usuários logados vejam o app interno.
 * ============================================================================
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

import { ProfileSelectionScreen } from '../screens/ProfileSelectionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PresencaAlunoScreen } from '../screens/PresencaAlunoScreen';
import { SenseiQrScreen } from '../screens/SenseiQrScreen';
import { PagamentosScreen } from '../screens/PagamentosScreen';

// [O QUE FAZ] Cria o navegador em pilha tipado.
// [POR QUE EXISTE] Navegação empilhada (push/pop) é o padrão do fluxo.
// [PARA QUE SERVE] Transições entre telas com header consistente.
const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  // [O QUE FAZ] Lê o usuário e o estado de carregamento da sessão.
  // [POR QUE EXISTE] Decidir qual conjunto de telas exibir.
  // [PARA QUE SERVE] Controla o roteamento com base na autenticação.
  const { user, loading } = useAuth();

  // [O QUE FAZ] Enquanto restaura a sessão, mostra o loading.
  // [POR QUE EXISTE] Evita exibir a tela errada por um instante.
  // [PARA QUE SERVE] Experiência sem "piscadas".
  if (loading) {
    return <Loading message="Carregando…" />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.textPrimary },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {user ? (
        // [O QUE FAZ] Stack do app (telas protegidas) quando há login.
        // [POR QUE EXISTE] Conteúdo só faz sentido autenticado.
        // [PARA QUE SERVE] Acesso às funcionalidades por perfil.
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'AMIS' }} />
          <Stack.Screen
            name="PresencaAluno"
            component={PresencaAlunoScreen}
            options={{ title: 'Presença' }}
          />
          <Stack.Screen
            name="SenseiQr"
            component={SenseiQrScreen}
            options={{ title: 'QR da Aula' }}
          />
          <Stack.Screen
            name="Pagamentos"
            component={PagamentosScreen}
            options={{ title: 'Pagamentos' }}
          />
        </>
      ) : (
        // [O QUE FAZ] Stack público (sem login).
        // [POR QUE EXISTE] Permitir escolher perfil, entrar ou cadastrar.
        // [PARA QUE SERVE] Porta de entrada do app.
        <>
          <Stack.Screen
            name="ProfileSelection"
            component={ProfileSelectionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Entrar' }} />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Criar conta' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
