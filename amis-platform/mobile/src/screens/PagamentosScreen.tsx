/**
 * ============================================================================
 * PagamentosScreen — "Meu Plano" (professor) / Acesso gratuito (aluno)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Mostra a assinatura do PROFESSOR (status/limite) e permite
 *              simular ativar/desativar o plano. Para o ALUNO, informa que o
 *              acesso é gratuito (quem paga é o professor).
 * [POR QUE EXISTE]  Novo modelo de negócio: a cobrança é do professor, não do
 *              aluno. O plano ativo é o que libera os módulos aos alunos.
 * [PARA QUE SERVE]  Transparência do plano e gating de liberação de módulos.
 * ============================================================================
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { OutlineButton } from '../components/OutlineButton';
import { useAuth } from '../context/AuthContext';
import { togglePlano, useDemoStore } from '../api/demoStore';
import { colors, spacing, typography } from '../theme';

export function PagamentosScreen(): React.JSX.Element {
  // [O QUE FAZ] Descobre o papel do usuário logado.
  // [POR QUE EXISTE] A tela muda para professor x aluno.
  // [PARA QUE SERVE] Mostrar plano (professor) ou aviso gratuito (aluno).
  const { user } = useAuth();
  const isProfessor = user?.role === 'SENSEI' || user?.role === 'GESTOR';

  // [O QUE FAZ] Lê o plano e os alunos vinculados do store.
  // [POR QUE EXISTE] Exibir status e uso (alunos/limite).
  // [PARA QUE SERVE] Atualiza ao ativar/desativar o plano.
  const { plano, vinculados } = useDemoStore();

  // ---------- VISÃO DO ALUNO: acesso gratuito ----------
  if (!isProfessor) {
    return (
      <Screen title="Acesso" subtitle="Seu acesso ao conteúdo">
        <Card>
          <Text style={styles.free}>Acesso gratuito ✅</Text>
          <Text style={styles.meta}>
            Você não paga nada. O seu professor mantém o plano e libera os
            módulos (Branca, Bordo, Cinza) para você assistir aos vídeos.
          </Text>
        </Card>
      </Screen>
    );
  }

  // ---------- VISÃO DO PROFESSOR: plano/assinatura ----------
  return (
    <Screen title="Meu Plano" subtitle="Sua assinatura libera o conteúdo dos alunos">
      <Card>
        <View style={styles.row}>
          <Text style={styles.planoNome}>{plano.nome}</Text>
          <Text style={[styles.status, { color: plano.ativo ? colors.success : colors.danger }]}>
            {plano.ativo ? 'ATIVO' : 'INATIVO'}
          </Text>
        </View>
        <Text style={styles.meta}>
          Limite: {plano.limiteAlunos} alunos · Em uso: {vinculados.length}
        </Text>

        {/* Aviso conforme o status do plano */}
        {plano.ativo ? (
          <Text style={styles.ok}>
            Plano Ativo — você pode liberar os módulos para seus alunos.
          </Text>
        ) : (
          <Text style={styles.error}>
            Plano inativo — reative para voltar a liberar módulos aos alunos.
          </Text>
        )}
      </Card>

      {/* Simulação de cobrança/assinatura (demo) */}
      {plano.ativo ? (
        <OutlineButton label="Simular cancelamento do plano" onPress={togglePlano} />
      ) : (
        <PrimaryButton label="Reativar plano" onPress={togglePlano} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  free: { color: colors.success, fontSize: 20, fontWeight: '700' },
  planoNome: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  status: { fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  meta: { color: colors.textSecondary, ...typography.subtitle, marginTop: spacing.xs },
  ok: { color: colors.success, ...typography.subtitle, marginTop: spacing.sm },
  error: { color: colors.danger, ...typography.subtitle, marginTop: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
