/**
 * ============================================================================
 * SenseiQrScreen — Sensei gera o QR Code da chamada (imagem + timer 5min)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Gera um código assinado, exibe uma IMAGEM de QR Code real e um
 *              cronômetro regressivo de 05:00.
 * [POR QUE EXISTE]  A chamada precisa de um QR escaneável e com validade curta.
 * [PARA QUE SERVE]  Após 5 min o QR some, o token é invalidado e aparece aviso.
 * ============================================================================
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { gerarQr } from '../api/presenca.api';
import { encodePresencaCodigo } from '../utils/presencaCodigo';
import { colors, radii, spacing, typography } from '../theme';

// [O QUE FAZ] Duração de validade do QR, em segundos (5 minutos).
// [POR QUE EXISTE] Regra de negócio do tempo de chamada.
// [PARA QUE SERVE] Base do cronômetro e da expiração.
const DURACAO_SEGUNDOS = 5 * 60;

// [O QUE FAZ] Formata segundos em "MM:SS".
// [POR QUE EXISTE] Exibir o tempo de forma legível.
// [PARA QUE SERVE] Mostrar 05:00, 04:59, … 00:00.
function formatar(segundos: number): string {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0');
  const s = (segundos % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function SenseiQrScreen(): React.JSX.Element {
  // [O QUE FAZ] Estados: código gerado, tempo restante, expiração, erro, loading.
  // [POR QUE EXISTE] Controlar a exibição do QR e do cronômetro.
  // [PARA QUE SERVE] Mostrar/ocultar o QR conforme o tempo.
  const [codigo, setCodigo] = useState<string | undefined>();
  const [segundos, setSegundos] = useState(0);
  const [expirado, setExpirado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // [O QUE FAZ] Guarda o id do timer para poder limpá-lo.
  // [POR QUE EXISTE] Evitar vários timers rodando ao mesmo tempo.
  // [PARA QUE SERVE] Limpar ao regenerar e ao sair da tela.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // [O QUE FAZ] Para o cronômetro atual, se existir.
  // [POR QUE EXISTE] Reuso ao regenerar e na limpeza.
  // [PARA QUE SERVE] Não acumular intervalos.
  const pararTimer = (): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // [O QUE FAZ] Ao desmontar a tela, limpa o timer.
  // [POR QUE EXISTE] Evitar vazamento de memória / updates fantasmas.
  // [PARA QUE SERVE] App estável ao navegar para outra tela.
  useEffect(() => pararTimer, []);

  // [O QUE FAZ] Pede o QR, monta o código e (re)inicia o cronômetro.
  // [POR QUE EXISTE] Ação central da tela.
  // [PARA QUE SERVE] Abrir a chamada com validade de 5 minutos.
  const handleGerar = async (): Promise<void> => {
    setError(undefined);
    try {
      setLoading(true);
      const qr = await gerarQr();
      setCodigo(encodePresencaCodigo(qr.qrToken, qr.senseiId, qr.dataAula));
      setExpirado(false);
      setSegundos(DURACAO_SEGUNDOS);

      pararTimer();
      // [O QUE FAZ] Decrementa 1s por vez; ao zerar, invalida o QR.
      // [POR QUE EXISTE] É o cronômetro regressivo da regra de negócio.
      // [PARA QUE SERVE] Após 5 min, esconde o QR e marca como expirado.
      timerRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s <= 1) {
            pararTimer();
            setExpirado(true);
            setCodigo(undefined);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar o QR.');
    } finally {
      setLoading(false);
    }
  };

  // [O QUE FAZ] Monta a URL da imagem do QR a partir do código.
  // [POR QUE EXISTE] Precisamos de um QR Code visual escaneável.
  // [PARA QUE SERVE] Renderiza um QR real (serviço público) no app/web.
  const qrUrl = codigo
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(codigo)}`
    : undefined;

  return (
    <Screen title="QR da Aula" subtitle="Gere o código e mostre para a turma">
      <PrimaryButton
        label={codigo ? 'Gerar novo código' : 'Gerar código da chamada'}
        onPress={handleGerar}
        loading={loading}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* QR ativo: imagem + cronômetro */}
      {qrUrl && !expirado ? (
        <Card>
          <Text style={styles.label}>Escaneie para registrar presença</Text>
          {/* [O QUE FAZ] Mostra a imagem do QR Code.
              [POR QUE EXISTE] O aluno escaneia para fazer check-in.
              [PARA QUE SERVE] Substitui o texto por um QR real. */}
          <Image
            source={{ uri: qrUrl }}
            style={styles.qr}
            accessibilityLabel="QR Code da chamada"
          />
          {/* [O QUE FAZ] Cronômetro regressivo.
              [POR QUE EXISTE] Comunicar o tempo restante de validade.
              [PARA QUE SERVE] O Sensei sabe quando o QR vai expirar. */}
          <Text style={styles.timer}>Expira em {formatar(segundos)}</Text>
          <Text style={styles.hint}>Válido por 5 minutos após a geração.</Text>
        </Card>
      ) : null}

      {/* QR expirado: aviso em vermelho */}
      {expirado ? (
        <Card>
          <Text style={styles.expirado}>
            QR Code Expirado! Gere um novo código para a chamada.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, ...typography.subtitle },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  qr: {
    width: 240,
    height: 240,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.sm,
    marginVertical: spacing.sm,
  },
  timer: { color: colors.primary, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  hint: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: spacing.xs },
  expirado: { color: colors.danger, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
