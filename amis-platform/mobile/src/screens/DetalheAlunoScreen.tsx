/**
 * ============================================================================
 * DetalheAlunoScreen — Perfil do Aluno para o Professor
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Mostra o progresso do aluno e switches para liberar/bloquear
 *              os módulos (Branca, Bordo, Cinza).
 * [POR QUE EXISTE]  O sensei controla o que cada aluno pode acessar.
 * [PARA QUE SERVE]  Ao desligar um módulo, a categoria some do app do aluno.
 * ============================================================================
 */
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import {
  MODULO_LABELS,
  getAluno,
  toggleModulo,
  useDemoStore,
  type ModuloKey,
} from '../api/demoStore';
import { colors, spacing, typography } from '../theme';
import type { ScreenProps } from '../navigation/types';

export function DetalheAlunoScreen({
  route,
}: ScreenProps<'DetalheAluno'>): React.JSX.Element {
  // [O QUE FAZ] Assina o store e lê o plano do professor.
  // [POR QUE EXISTE] Reagir a mudanças e gatear pelo plano ativo.
  // [PARA QUE SERVE] Só libera módulos quando o plano está ativo.
  const { plano } = useDemoStore();

  // [O QUE FAZ] Pega o id do aluno vindo da navegação e busca seus dados.
  // [POR QUE EXISTE] Esta tela é genérica para qualquer aluno selecionado.
  // [PARA QUE SERVE] Exibir o perfil correto.
  const { alunoId } = route.params;
  const aluno = getAluno(alunoId);

  // [O QUE FAZ] Proteção caso o aluno não exista (ex.: removido).
  // [POR QUE EXISTE] Evita erro ao acessar propriedades de undefined.
  // [PARA QUE SERVE] Mostra um aviso amigável.
  if (!aluno) {
    return (
      <Screen title="Aluno">
        <Text style={styles.meta}>Aluno não encontrado.</Text>
      </Screen>
    );
  }

  // [O QUE FAZ] Ordem fixa dos módulos exibidos.
  // [POR QUE EXISTE] Garante a mesma sequência sempre.
  // [PARA QUE SERVE] Lista previsível dos switches.
  const modulos: ModuloKey[] = ['BRANCA', 'BORDO', 'CINZA'];

  return (
    <Screen title={aluno.nome} subtitle="Perfil e controle de acesso">
      {/* Progresso do aluno */}
      <Card>
        <Text style={styles.cardTitle}>Progresso</Text>
        <Text style={styles.meta}>Presenças: {aluno.presencas} aulas</Text>
        <Text style={styles.meta}>Vídeos assistidos: {aluno.videosPct}%</Text>
      </Card>

      {/* Chaves de liberação de módulos */}
      <Card>
        <Text style={styles.cardTitle}>Chaves de Liberação</Text>
        {/* [O QUE FAZ] Mostra aviso quando o plano está inativo.
            [POR QUE EXISTE] Sem plano ativo, não se libera conteúdo.
            [PARA QUE SERVE] Orienta o professor a reativar o plano. */}
        {plano.ativo ? (
          <Text style={styles.hint}>Desligue um módulo para ocultá-lo no app do aluno.</Text>
        ) : (
          <Text style={styles.bloqueio}>
            Plano inativo: reative seu plano para liberar módulos.
          </Text>
        )}

        {modulos.map((m) => (
          <View key={m} style={styles.switchRow}>
            <Text style={styles.switchLabel}>{MODULO_LABELS[m]}</Text>
            {/* [O QUE FAZ] Liga/desliga o acesso ao módulo (só com plano ativo).
                [POR QUE EXISTE] Controle pedagógico por faixa + gating do plano.
                [PARA QUE SERVE] Reflete na visão do aluno em tempo real. */}
            <Switch
              value={aluno.modulos[m]}
              onValueChange={() => toggleModulo(aluno.id, m)}
              disabled={!plano.ativo}
              trackColor={{ false: '#444', true: colors.primary }}
              thumbColor={colors.textPrimary}
              accessibilityLabel={MODULO_LABELS[m]}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.textSecondary, ...typography.subtitle },
  hint: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm },
  bloqueio: { color: colors.danger, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  switchLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});
