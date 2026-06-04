/**
 * ============================================================================
 * SenseiAlunosScreen — Painel "Meus Alunos" do Sensei
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Mostra "Solicitações Pendentes" (Aceitar/Recusar) e a lista
 *              de "Alunos Vinculados" (cards clicáveis).
 * [POR QUE EXISTE]  O sensei gerencia quem entra na sua turma.
 * [PARA QUE SERVE]  Aprovar vínculos e abrir o perfil de cada aluno.
 * ============================================================================
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { OutlineButton } from '../components/OutlineButton';
import { aceitarAluno, recusarAluno, useDemoStore } from '../api/demoStore';
import { colors, spacing, typography } from '../theme';
import type { ScreenProps } from '../navigation/types';

export function SenseiAlunosScreen({
  navigation,
}: ScreenProps<'SenseiAlunos'>): React.JSX.Element {
  // [O QUE FAZ] Lê pendentes e vinculados do store de demo.
  // [POR QUE EXISTE] São as duas seções desta tela.
  // [PARA QUE SERVE] Re-renderiza ao aceitar/recusar alunos.
  const { pendentes, vinculados } = useDemoStore();

  return (
    <Screen title="Meus Alunos" subtitle="Gerencie vínculos e acompanhe o progresso">
      {/* SEÇÃO 1 — Solicitações Pendentes */}
      <Text style={styles.section}>Solicitações Pendentes</Text>
      {pendentes.length === 0 ? (
        <Text style={styles.empty}>Nenhuma solicitação no momento.</Text>
      ) : (
        pendentes.map((aluno) => (
          <Card key={aluno.id}>
            <Text style={styles.nome}>{aluno.nome}</Text>
            <Text style={styles.meta}>Pediu para entrar na sua turma</Text>
            {/* Ações de aprovação */}
            <View style={styles.row}>
              <PrimaryButton
                label="Aceitar"
                onPress={() => aceitarAluno(aluno.id)}
                style={styles.flexBtn}
              />
              <OutlineButton
                label="Recusar"
                onPress={() => recusarAluno(aluno.id)}
                style={styles.flexBtn}
              />
            </View>
          </Card>
        ))
      )}

      {/* SEÇÃO 2 — Alunos Vinculados */}
      <Text style={[styles.section, styles.sectionGap]}>Alunos Vinculados</Text>
      {vinculados.length === 0 ? (
        <Text style={styles.empty}>Você ainda não tem alunos vinculados.</Text>
      ) : (
        vinculados.map((aluno) => (
          // [O QUE FAZ] Card clicável que abre o perfil do aluno.
          // [POR QUE EXISTE] O sensei precisa entrar no detalhe para gerenciar.
          // [PARA QUE SERVE] Navega para DetalheAluno passando o id.
          <Pressable
            key={aluno.id}
            accessibilityRole="button"
            accessibilityLabel={`Abrir perfil de ${aluno.nome}`}
            onPress={() => navigation.navigate('DetalheAluno', { alunoId: aluno.id })}
          >
            <Card>
              <Text style={styles.nome}>{aluno.nome}</Text>
              <Text style={styles.meta}>
                Presenças: {aluno.presencas} · Vídeos: {aluno.videosPct}%
              </Text>
              <Text style={styles.link}>Ver perfil ›</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  sectionGap: { marginTop: spacing.md },
  empty: { color: colors.textSecondary, ...typography.subtitle },
  nome: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.textSecondary, ...typography.subtitle },
  link: { color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flexBtn: { flex: 1 },
});
