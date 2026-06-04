/**
 * ============================================================================
 * VinculoProfessorScreen — Aluno solicita vínculo a um professor
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Campo para digitar o nome do Sensei + botão "Solicitar Vínculo".
 * [POR QUE EXISTE]  O aluno recém-cadastrado precisa se ligar a um professor.
 * [PARA QUE SERVE]  Inicia o vínculo; status fica "Pendente" até o sensei aceitar.
 * ============================================================================
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { solicitarVinculo, useDemoStore } from '../api/demoStore';
import { colors, spacing, typography } from '../theme';

export function VinculoProfessorScreen(): React.JSX.Element {
  // [O QUE FAZ] Lê o estado do vínculo (status atual e nome do sensei).
  // [POR QUE EXISTE] Mostrar se já existe um pedido em andamento.
  // [PARA QUE SERVE] Atualiza a tela quando o status muda.
  const { vinculoStatus, vinculoSensei } = useDemoStore();

  // [O QUE FAZ] Guarda o nome digitado e o erro do campo.
  // [POR QUE EXISTE] Controlar o input e validar antes de enviar.
  // [PARA QUE SERVE] Evita enviar pedido com nome vazio.
  const [nome, setNome] = useState('');
  const [error, setError] = useState<string | undefined>();

  // [O QUE FAZ] Valida e registra o pedido de vínculo.
  // [POR QUE EXISTE] É a ação central da tela.
  // [PARA QUE SERVE] Deixa o status "Pendente" (simulação).
  const handleSolicitar = (): void => {
    if (nome.trim().length < 2) {
      setError('Digite o nome do seu professor.');
      return;
    }
    setError(undefined);
    solicitarVinculo(nome);
    setNome('');
  };

  return (
    <Screen title="Vincular Professor" subtitle="Conecte-se ao seu Sensei para começar">
      {/* Status atual do vínculo */}
      {vinculoStatus === 'PENDENTE' ? (
        <Card>
          <Text style={styles.statusLabel}>Status do vínculo</Text>
          <View style={styles.badgePend}>
            <Text style={styles.badgePendText}>PENDENTE</Text>
          </View>
          <Text style={styles.meta}>
            Aguardando {vinculoSensei} aceitar sua solicitação…
          </Text>
        </Card>
      ) : null}

      {vinculoStatus === 'ACEITO' ? (
        <Card>
          <Text style={styles.statusLabel}>Status do vínculo</Text>
          <View style={styles.badgeOk}>
            <Text style={styles.badgeOkText}>ACEITO</Text>
          </View>
          <Text style={styles.meta}>Você está vinculado a {vinculoSensei}.</Text>
        </Card>
      ) : null}

      {/* Formulário de solicitação */}
      <Card>
        <TextField
          label="Nome do seu Professor/Sensei"
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Sensei Tanaka"
          autoCapitalize="words"
          error={error}
        />
        <PrimaryButton label="Solicitar Vínculo" onPress={handleSolicitar} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.textPrimary, ...typography.subtitle, marginTop: spacing.xs },
  badgePend: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(230,138,0,0.15)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.xs,
  },
  badgePendText: { color: colors.primary, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  badgeOk: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,158,91,0.15)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.xs,
  },
  badgeOkText: { color: colors.success, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});
