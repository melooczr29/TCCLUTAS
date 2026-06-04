/**
 * ============================================================================
 * PresencaAlunoScreen — Aluno registra presença e vê o histórico
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Recebe o "código de presença", registra o check-in e lista o histórico.
 * [POR QUE EXISTE]  É a função central do aluno (presença confiável).
 * [PARA QUE SERVE]  Persiste a presença validada no backend e mostra o passado.
 * ============================================================================
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { listarPresencas, registrarPresenca } from '../api/presenca.api';
import { decodePresencaCodigo } from '../utils/presencaCodigo';
import type { PresencaItem } from '../api/types';
import { colors, spacing, typography } from '../theme';

export function PresencaAlunoScreen(): React.JSX.Element {
  // [O QUE FAZ] Estados do formulário, mensagens e lista do histórico.
  // [POR QUE EXISTE] Controlar input, feedback e dados carregados.
  // [PARA QUE SERVE] Tela reativa e clara.
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<PresencaItem[]>([]);

  // [O QUE FAZ] Carrega o histórico de presenças do aluno.
  // [POR QUE EXISTE] Mostrar as presenças já registradas.
  // [PARA QUE SERVE] Atualiza a lista após cada novo registro.
  const carregar = useCallback(async (): Promise<void> => {
    try {
      const { items } = await listarPresencas();
      setHistorico(items);
    } catch {
      // Silencioso: a lista apenas fica vazia se falhar.
    }
  }, []);

  // [O QUE FAZ] Ao abrir a tela, carrega o histórico uma vez.
  // [POR QUE EXISTE] Dados iniciais para o usuário.
  // [PARA QUE SERVE] Evita tela vazia sem contexto.
  useEffect(() => {
    void carregar();
  }, [carregar]);

  // [O QUE FAZ] Decodifica o código e registra a presença.
  // [POR QUE EXISTE] Transformar 1 código em 3 campos exigidos pelo backend.
  // [PARA QUE SERVE] Faz o check-in real e atualiza a lista.
  const handleRegistrar = async (): Promise<void> => {
    setError(undefined);
    setSuccess(undefined);

    const decoded = decodePresencaCodigo(codigo);
    if (!decoded.ok || !decoded.qrToken || !decoded.senseiId || !decoded.dataAula) {
      setError('Código de presença inválido. Peça um novo ao seu Sensei.');
      return;
    }

    try {
      setLoading(true);
      await registrarPresenca({
        qrToken: decoded.qrToken,
        senseiId: decoded.senseiId,
        dataAula: decoded.dataAula,
      });
      setSuccess('Presença registrada com sucesso! ✅');
      setCodigo('');
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar presença.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Presença" subtitle="Cole o código fornecido pelo seu Sensei">
      <TextField
        label="Código de presença"
        value={codigo}
        onChangeText={setCodigo}
        placeholder="Cole aqui o código da aula"
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <PrimaryButton label="Registrar presença" onPress={handleRegistrar} loading={loading} />

      {/* Histórico */}
      <Text style={styles.sectionTitle}>Meu histórico</Text>
      {historico.length === 0 ? (
        <Text style={styles.empty}>Nenhuma presença registrada ainda.</Text>
      ) : (
        historico.map((p) => (
          <Card key={p.id}>
            <View style={styles.row}>
              <Text style={styles.itemDate}>{new Date(p.dataAula).toLocaleString('pt-BR')}</Text>
              <Text style={styles.itemStatus}>{p.status}</Text>
            </View>
            <Text style={styles.itemSensei}>Sensei: {p.sensei?.nome ?? '—'}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, ...typography.subtitle },
  success: { color: colors.success, ...typography.subtitle },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  empty: { color: colors.textSecondary, ...typography.subtitle },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  itemDate: { color: colors.textPrimary, fontWeight: '600' },
  itemStatus: { color: colors.primary, fontWeight: '700' },
  itemSensei: { color: colors.textSecondary, ...typography.subtitle },
});
