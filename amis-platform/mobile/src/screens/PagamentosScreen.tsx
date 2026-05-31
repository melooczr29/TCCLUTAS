/**
 * ============================================================================
 * PagamentosScreen — Histórico e (para GESTOR) criação de cobrança
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Lista pagamentos; o GESTOR cria uma intenção de pagamento (Stripe).
 * [POR QUE EXISTE]  Transparência financeira + emissão segura de cobranças.
 * [PARA QUE SERVE]  Mostra o status (PAGO/PENDENTE/FALHOU) e inicia pagamentos.
 *
 * Segurança: o app NUNCA vê dados de cartão. O backend cria o PaymentIntent e
 * devolve o client_secret; no build nativo, a Payment Sheet da Stripe finaliza.
 * ============================================================================
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { criarCobranca, listarPagamentos } from '../api/pagamento.api';
import type { PagamentoItem } from '../api/types';
import { colors, spacing, typography } from '../theme';

// [O QUE FAZ] Mapeia o status do pagamento para uma cor.
// [POR QUE EXISTE] Comunicar visualmente o estado (verde/amarelo/vermelho).
// [PARA QUE SERVE] Leitura rápida do histórico.
function corDoStatus(status: PagamentoItem['status']): string {
  if (status === 'PAGO') return colors.success;
  if (status === 'FALHOU') return colors.danger;
  return colors.primary;
}

export function PagamentosScreen(): React.JSX.Element {
  // [O QUE FAZ] Usuário logado (para saber se é GESTOR).
  // [POR QUE EXISTE] Só o GESTOR pode criar cobrança (RBAC no front + backend).
  // [PARA QUE SERVE] Mostra o formulário apenas a quem tem permissão.
  const { user } = useAuth();
  const isGestor = user?.role === 'GESTOR';

  // [O QUE FAZ] Estados da lista e do formulário de cobrança.
  // [POR QUE EXISTE] Controlar dados e inputs reativos.
  // [PARA QUE SERVE] Exibir histórico e criar cobranças.
  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>([]);
  const [userId, setUserId] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // [O QUE FAZ] Carrega os pagamentos do usuário autenticado.
  // [POR QUE EXISTE] Mostrar o histórico financeiro.
  // [PARA QUE SERVE] Atualiza a lista ao abrir e após criar cobrança.
  const carregar = useCallback(async (): Promise<void> => {
    try {
      setPagamentos(await listarPagamentos());
    } catch {
      // Lista vazia em caso de falha.
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // [O QUE FAZ] Cria a intenção de pagamento (apenas GESTOR).
  // [POR QUE EXISTE] Emitir uma cobrança para um aluno.
  // [PARA QUE SERVE] Backend gera o PaymentIntent; mostramos confirmação.
  const handleCobrar = async (): Promise<void> => {
    setError(undefined);
    setSuccess(undefined);

    const valorNum = Number(valor.replace(',', '.'));
    if (!userId.trim()) return setError('Informe o ID do aluno (UUID).');
    if (!Number.isFinite(valorNum) || valorNum <= 0) return setError('Informe um valor válido.');

    try {
      setLoading(true);
      const res = await criarCobranca({
        userId: userId.trim(),
        valor: valorNum,
        descricao: descricao.trim() || undefined,
      });
      setSuccess(`Cobrança criada! Pagamento: ${res.pagamentoId}`);
      setUserId('');
      setValor('');
      setDescricao('');
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar cobrança.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title={isGestor ? 'Cobranças & Pagamentos' : 'Meus Pagamentos'}
      subtitle="Acompanhe o status das transações"
    >
      {/* Formulário de cobrança (somente GESTOR) */}
      {isGestor ? (
        <Card>
          <Text style={styles.formTitle}>Nova cobrança</Text>
          <TextField label="ID do aluno (UUID)" value={userId} onChangeText={setUserId} />
          <TextField
            label="Valor (R$)"
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
            placeholder="149.90"
          />
          <TextField
            label="Descrição (opcional)"
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Mensalidade Judô - Junho"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <PrimaryButton label="Criar cobrança" onPress={handleCobrar} loading={loading} />
        </Card>
      ) : null}

      {/* Mensagens para não-gestores (que não têm o formulário) */}
      {!isGestor && error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Histórico */}
      <Text style={styles.sectionTitle}>Histórico</Text>
      {pagamentos.length === 0 ? (
        <Text style={styles.empty}>Nenhum pagamento encontrado.</Text>
      ) : (
        pagamentos.map((p) => (
          <Card key={p.id}>
            <View style={styles.row}>
              <Text style={styles.valor}>R$ {Number(p.valor).toFixed(2)}</Text>
              <Text style={[styles.status, { color: corDoStatus(p.status) }]}>{p.status}</Text>
            </View>
            {p.descricao ? <Text style={styles.desc}>{p.descricao}</Text> : null}
            <Text style={styles.data}>{new Date(p.dataCriacao).toLocaleString('pt-BR')}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  formTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: spacing.lg },
  empty: { color: colors.textSecondary, ...typography.subtitle },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  valor: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  status: { fontWeight: '700' },
  desc: { color: colors.textSecondary, ...typography.subtitle },
  data: { color: colors.textSecondary, fontSize: 12 },
  error: { color: colors.danger, ...typography.subtitle },
  success: { color: colors.success, ...typography.subtitle },
});
