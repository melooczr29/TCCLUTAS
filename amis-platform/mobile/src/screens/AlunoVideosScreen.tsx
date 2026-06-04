/**
 * ============================================================================
 * AlunoVideosScreen — Vídeos de golpes por módulo (faixa)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Lista os módulos LIBERADOS para o aluno e seus vídeos. Ao tocar
 *              em um vídeo, abre o player para assistir.
 * [POR QUE EXISTE]  O aluno consome o conteúdo pedagógico liberado pelo Sensei.
 * [PARA QUE SERVE]  Estudar as técnicas (Branca, Bordo, Cinza) em vídeo.
 * ----------------------------------------------------------------------------
 * Regra: módulos desativados pelo professor NÃO aparecem aqui.
 * ============================================================================
 */
import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import {
  MODULO_LABELS,
  VIDEOS,
  useDemoStore,
  type ModuloKey,
} from '../api/demoStore';
import { colors, radii, spacing, typography } from '../theme';

export function AlunoVideosScreen(): React.JSX.Element {
  // [O QUE FAZ] Lê quais módulos o professor liberou para o aluno.
  // [POR QUE EXISTE] Só mostramos o que foi ativado.
  // [PARA QUE SERVE] Esconder módulos desativados (ex.: Bordo).
  const { alunoModulos } = useDemoStore();

  // [O QUE FAZ] Ordem fixa e filtro só dos módulos ativos.
  // [POR QUE EXISTE] Exibição previsível e respeitando a liberação.
  // [PARA QUE SERVE] Renderizar apenas as faixas liberadas.
  const ordem: ModuloKey[] = ['BRANCA', 'BORDO', 'CINZA'];
  const liberados = ordem.filter((m) => alunoModulos[m]);

  // [O QUE FAZ] Abre o vídeo no player do dispositivo/navegador.
  // [POR QUE EXISTE] Reproduzir o conteúdo de forma confiável (web e nativo).
  // [PARA QUE SERVE] O aluno assiste à técnica selecionada.
  const assistir = (url: string): void => {
    void Linking.openURL(url);
  };

  return (
    <Screen title="Meus Vídeos" subtitle="Técnicas liberadas pelo seu professor">
      {/* Nenhum módulo liberado */}
      {liberados.length === 0 ? (
        <Card>
          <Text style={styles.empty}>
            Nenhum módulo liberado ainda. Peça ao seu professor para ativar.
          </Text>
        </Card>
      ) : null}

      {/* Lista por módulo */}
      {liberados.map((modulo) => (
        <View key={modulo} style={styles.bloco}>
          <Text style={styles.section}>{MODULO_LABELS[modulo]}</Text>

          {VIDEOS[modulo].map((video) => (
            // [O QUE FAZ] Card de vídeo clicável (capa + título).
            // [POR QUE EXISTE] Cada item abre uma aula em vídeo.
            // [PARA QUE SERVE] Tocar para assistir.
            <Pressable
              key={video.id}
              accessibilityRole="button"
              accessibilityLabel={`Assistir ${video.titulo}`}
              onPress={() => assistir(video.url)}
            >
              <Card>
                <Image
                  source={{ uri: video.thumb }}
                  style={styles.thumb}
                  accessibilityLabel={`Capa do vídeo ${video.titulo}`}
                />
                <Text style={styles.titulo}>{video.titulo}</Text>
                <Text style={styles.play}>▶ Assistir</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textSecondary, ...typography.subtitle },
  bloco: { gap: spacing.sm },
  section: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  thumb: {
    width: '100%',
    height: 160,
    borderRadius: radii.sm,
    backgroundColor: '#000',
  },
  titulo: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: spacing.xs },
  play: { color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
});
