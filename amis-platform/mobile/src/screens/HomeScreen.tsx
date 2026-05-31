/**
 * ============================================================================
 * HomeScreen — Painel principal (muda conforme o perfil)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Saúda o usuário e mostra atalhos conforme o papel (RBAC no front).
 * [POR QUE EXISTE]  Cada perfil tem funções diferentes (aluno x sensei x gestor).
 * [PARA QUE SERVE]  Leva o usuário rapidamente à ação certa.
 * ============================================================================
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { OutlineButton } from '../components/OutlineButton';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography } from '../theme';
import type { ScreenProps } from '../navigation/types';

export function HomeScreen({ navigation }: ScreenProps<'Home'>): React.JSX.Element {
  // [O QUE FAZ] Pega o usuário logado e a ação de logout.
  // [POR QUE EXISTE] Personalizar a tela e permitir sair.
  // [PARA QUE SERVE] Conteúdo por perfil + botão de logout.
  const { user, signOut } = useAuth();

  // [O QUE FAZ] Proteção: se não houver usuário, não renderiza nada.
  // [POR QUE EXISTE] Segurança de tipos (user pode ser null no tipo).
  // [PARA QUE SERVE] Evita erros de acesso a propriedades de null.
  if (!user) return <Screen scroll={false}><View /></Screen>;

  // [O QUE FAZ] Define os atalhos visíveis conforme o papel.
  // [POR QUE EXISTE] Cada perfil acessa funções diferentes.
  // [PARA QUE SERVE] Mostra só o que faz sentido para o usuário.
  const isAluno = user.role === 'ALUNO';
  const isSensei = user.role === 'SENSEI';
  const isGestor = user.role === 'GESTOR';

  return (
    <Screen>
      {/* Saudação */}
      <Card>
        <Text style={styles.hello}>Olá, {user.nome.split(' ')[0]} 👋</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{user.role}</Text>
        </View>
        <Text style={styles.email}>{user.email}</Text>
      </Card>

      {/* Atalho: Presença do aluno */}
      {isAluno ? (
        <PrimaryButton
          label="Registrar Presença"
          onPress={() => navigation.navigate('PresencaAluno')}
        />
      ) : null}

      {/* Atalho: Gerar QR (Sensei/Gestor) */}
      {isSensei || isGestor ? (
        <PrimaryButton label="Gerar QR da Aula" onPress={() => navigation.navigate('SenseiQr')} />
      ) : null}

      {/* Atalho: Pagamentos (todos) */}
      <PrimaryButton
        label={isGestor ? 'Cobranças & Pagamentos' : 'Meus Pagamentos'}
        onPress={() => navigation.navigate('Pagamentos')}
      />

      {/* Sair */}
      <OutlineButton label="Sair da conta" onPress={signOut} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: { color: colors.textPrimary, ...typography.title, fontSize: 24 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(230,138,0,0.15)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.xs,
  },
  badgeText: { color: colors.primary, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  email: { color: colors.textSecondary, ...typography.subtitle, marginTop: spacing.xs },
  logout: { marginTop: spacing.lg },
});
