/**
 * ============================================================================
 * SenseiQrScreen — Sensei gera o código de presença da aula
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Solicita o QR assinado ao backend e exibe um código compartilhável.
 * [POR QUE EXISTE]  O Sensei abre a "chamada" da aula de forma segura.
 * [PARA QUE SERVE]  Alunos usam esse código para registrar presença (anti-fraude).
 *
 * Observação: no build NATIVO, este código viraria um QR Code visual escaneável.
 * Aqui mostramos o texto para funcionar também no navegador (demonstração).
 * ============================================================================
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { gerarQr } from '../api/presenca.api';
import { encodePresencaCodigo } from '../utils/presencaCodigo';
import { colors, spacing, typography } from '../theme';

export function SenseiQrScreen(): React.JSX.Element {
  // [O QUE FAZ] Estados do código gerado, erro e loading.
  // [POR QUE EXISTE] Controlar o resultado e o feedback.
  // [PARA QUE SERVE] Exibir o código e tratar falhas.
  const [codigo, setCodigo] = useState<string | undefined>();
  const [info, setInfo] = useState<{ senseiId: string; dataAula: string } | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // [O QUE FAZ] Pede o QR ao backend e monta o código compartilhável.
  // [POR QUE EXISTE] É a ação central desta tela.
  // [PARA QUE SERVE] Gera o token assinado válido por tempo limitado.
  const handleGerar = async (): Promise<void> => {
    setError(undefined);
    try {
      setLoading(true);
      const qr = await gerarQr();
      setCodigo(encodePresencaCodigo(qr.qrToken, qr.senseiId, qr.dataAula));
      setInfo({ senseiId: qr.senseiId, dataAula: qr.dataAula });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar o QR.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="QR da Aula" subtitle="Gere o código e compartilhe com a turma">
      <PrimaryButton label="Gerar novo código" onPress={handleGerar} loading={loading} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {codigo ? (
        <Card>
          <Text style={styles.label}>Código de presença (válido por 2h)</Text>
          <Text selectable style={styles.codigo}>
            {codigo}
          </Text>
          {info ? (
            <Text style={styles.meta}>
              Aula: {new Date(info.dataAula).toLocaleString('pt-BR')}
            </Text>
          ) : null}
          <Text style={styles.hint}>
            Peça aos alunos para colar este código na tela de Presença. No app
            nativo, ele é exibido como um QR Code para escanear.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, ...typography.subtitle },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  codigo: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  meta: { color: colors.textPrimary, ...typography.subtitle, marginTop: spacing.xs },
  hint: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.sm },
});
