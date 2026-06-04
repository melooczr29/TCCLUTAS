/**
 * ============================================================================
 * demoStore — Estado compartilhado do Modo Demo (vínculo, alunos, módulos)
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Guarda em memória o vínculo do aluno, a lista de alunos do
 *              sensei e quais módulos estão liberados para cada aluno.
 * [POR QUE EXISTE]  As telas (Vínculo, Meus Alunos, Detalhe) precisam reagir
 *              umas às outras sem backend real.
 * [PARA QUE SERVE]  Demonstrar o fluxo completo: pedir vínculo -> aceitar ->
 *              controlar progresso e liberar/bloquear módulos.
 * ----------------------------------------------------------------------------
 * Usa o padrão "external store" do React (useSyncExternalStore) para que
 * qualquer tela re-renderize quando o estado mudar.
 * ============================================================================
 */
import { useSyncExternalStore } from 'react';

// [O QUE FAZ] Chaves dos três módulos pedagógicos (faixas).
// [POR QUE EXISTE] Padronizar os nomes usados nos switches e no app do aluno.
// [PARA QUE SERVE] Evita erro de digitação ao ligar/desligar módulos.
export type ModuloKey = 'BRANCA' | 'BORDO' | 'CINZA';

// [O QUE FAZ] Rótulos amigáveis exibidos na interface.
// [POR QUE EXISTE] Separar a chave técnica do texto mostrado.
// [PARA QUE SERVE] Mostrar "Módulo Branca" em vez de "BRANCA".
export const MODULO_LABELS: Record<ModuloKey, string> = {
  BRANCA: 'Módulo Branca',
  BORDO: 'Módulo Bordo',
  CINZA: 'Módulo Cinza',
};

// [O QUE FAZ] Representa um aluno na visão do sensei.
// [POR QUE EXISTE] Carregar nome, progresso e módulos liberados.
// [PARA QUE SERVE] Alimentar os cards e a tela de detalhe.
export interface AlunoDemo {
  id: string;
  nome: string;
  presencas: number;
  videosPct: number;
  modulos: Record<ModuloKey, boolean>;
}

// [O QUE FAZ] Representa a assinatura (plano) do professor.
// [POR QUE EXISTE] O novo modelo cobra do professor, não do aluno.
// [PARA QUE SERVE] Liberar módulos só quando o plano está ativo.
export interface PlanoDemo {
  nome: string;
  ativo: boolean;
  limiteAlunos: number;
}

// [O QUE FAZ] Representa um vídeo de golpe dentro de um módulo.
// [POR QUE EXISTE] O aluno assiste aos vídeos liberados.
// [PARA QUE SERVE] Montar a lista de aulas em vídeo por faixa.
export interface VideoDemo {
  id: string;
  titulo: string;
  url: string;
  thumb: string;
}

// [O QUE FAZ] Catálogo de vídeos por módulo (faixa).
// [POR QUE EXISTE] Conteúdo pedagógico de demonstração.
// [PARA QUE SERVE] Alimentar a tela de vídeos do aluno.
export const VIDEOS: Record<ModuloKey, VideoDemo[]> = {
  BRANCA: [
    {
      id: 'b1',
      titulo: 'Ukemi — Rolamento de segurança',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      thumb: 'https://picsum.photos/seed/branca1/320/180',
    },
    {
      id: 'b2',
      titulo: 'O-goshi — Projeção de quadril',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumb: 'https://picsum.photos/seed/branca2/320/180',
    },
  ],
  BORDO: [
    {
      id: 'bo1',
      titulo: 'Armlock pela guarda',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumb: 'https://picsum.photos/seed/bordo1/320/180',
    },
  ],
  CINZA: [
    {
      id: 'c1',
      titulo: 'Triângulo — finalização',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumb: 'https://picsum.photos/seed/cinza1/320/180',
    },
  ],
};

// [O QUE FAZ] Formato completo do estado de demonstração.
// [POR QUE EXISTE] Centralizar tudo que muda durante a navegação.
// [PARA QUE SERVE] Uma única fonte da verdade para o demo.
interface DemoState {
  vinculoStatus: 'NENHUM' | 'PENDENTE' | 'ACEITO';
  vinculoSensei?: string;
  pendentes: AlunoDemo[];
  vinculados: AlunoDemo[];
  plano: PlanoDemo;
  alunoModulos: Record<ModuloKey, boolean>;
}

// [O QUE FAZ] Cria o conjunto padrão de módulos (todos liberados).
// [POR QUE EXISTE] Todo aluno novo começa com acesso total.
// [PARA QUE SERVE] Evita repetir o objeto em vários lugares.
const modulosPadrao = (): Record<ModuloKey, boolean> => ({
  BRANCA: true,
  BORDO: true,
  CINZA: true,
});

// [O QUE FAZ] Estado inicial com dados de exemplo (1 pendente, 2 vinculados).
// [POR QUE EXISTE] A tela do sensei já abre com conteúdo visível.
// [PARA QUE SERVE] Demonstração imediata sem precisar cadastrar nada.
let state: DemoState = {
  vinculoStatus: 'NENHUM',
  vinculoSensei: undefined,
  pendentes: [
    { id: 'al-100', nome: 'Carlos Souza', presencas: 0, videosPct: 0, modulos: modulosPadrao() },
  ],
  vinculados: [
    { id: 'al-1', nome: 'Ana Lima', presencas: 12, videosPct: 85, modulos: modulosPadrao() },
    { id: 'al-2', nome: 'Bruno Dias', presencas: 7, videosPct: 40, modulos: { BRANCA: true, BORDO: false, CINZA: true } },
  ],
  // [O QUE FAZ] Plano do professor (ativo por padrão, limite 100).
  // [POR QUE EXISTE] Demonstrar o novo modelo de cobrança (no professor).
  // [PARA QUE SERVE] Gating: só libera módulos com plano ativo.
  plano: { nome: 'Plano Pro', ativo: true, limiteAlunos: 100 },
  // [O QUE FAZ] Módulos liberados para o aluno logado (demo).
  // [POR QUE EXISTE] O aluno vê apenas o que o professor ativou.
  // [PARA QUE SERVE] Esconder vídeos de módulos desativados (ex.: Bordo).
  alunoModulos: { BRANCA: true, BORDO: false, CINZA: true },
};

// [O QUE FAZ] Lista de funções inscritas para serem avisadas em mudanças.
// [POR QUE EXISTE] É o mecanismo que dispara o re-render das telas.
// [PARA QUE SERVE] Manter a UI sincronizada com o estado.
const listeners = new Set<() => void>();

// [O QUE FAZ] Substitui o estado e avisa todos os inscritos.
// [POR QUE EXISTE] Toda alteração precisa notificar a UI.
// [PARA QUE SERVE] Garante reatividade ao mexer no demo.
function setState(next: DemoState): void {
  state = next;
  listeners.forEach((l) => l());
}

// [O QUE FAZ] Registra um ouvinte e devolve a função para cancelar.
// [POR QUE EXISTE] Exigência do useSyncExternalStore.
// [PARA QUE SERVE] Conectar React ao store externo.
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// [O QUE FAZ] Devolve o estado atual (snapshot).
// [POR QUE EXISTE] O React precisa ler o valor vigente.
// [PARA QUE SERVE] Fornecer dados às telas a cada render.
function getSnapshot(): DemoState {
  return state;
}

// ----------------------------------------------------------------------------
// AÇÕES (mutam o estado de forma imutável)
// ----------------------------------------------------------------------------

// [O QUE FAZ] Aluno solicita vínculo a um professor pelo nome.
// [POR QUE EXISTE] Primeiro passo do fluxo de vínculo.
// [PARA QUE SERVE] Deixa o status "Pendente" até o sensei aceitar.
export function solicitarVinculo(nomeSensei: string): void {
  setState({ ...state, vinculoStatus: 'PENDENTE', vinculoSensei: nomeSensei.trim() });
}

// [O QUE FAZ] Sensei aceita a solicitação de um aluno pendente.
// [POR QUE EXISTE] Move o aluno de "pendentes" para "vinculados".
// [PARA QUE SERVE] Conclui o vínculo e libera o acompanhamento.
export function aceitarAluno(id: string): void {
  const aluno = state.pendentes.find((a) => a.id === id);
  if (!aluno) return;
  setState({
    ...state,
    pendentes: state.pendentes.filter((a) => a.id !== id),
    vinculados: [...state.vinculados, aluno],
  });
}

// [O QUE FAZ] Sensei recusa a solicitação de um aluno.
// [POR QUE EXISTE] Nem todo pedido deve ser aceito.
// [PARA QUE SERVE] Remove o aluno da lista de pendentes.
export function recusarAluno(id: string): void {
  setState({ ...state, pendentes: state.pendentes.filter((a) => a.id !== id) });
}

// [O QUE FAZ] Liga/desliga um módulo de um aluno específico.
// [POR QUE EXISTE] Controle pedagógico de acesso por faixa.
// [PARA QUE SERVE] Ao desligar, a categoria some do app do aluno.
export function toggleModulo(id: string, modulo: ModuloKey): void {
  setState({
    ...state,
    vinculados: state.vinculados.map((a) =>
      a.id === id ? { ...a, modulos: { ...a.modulos, [modulo]: !a.modulos[modulo] } } : a,
    ),
  });
}

// [O QUE FAZ] Busca um aluno vinculado pelo id.
// [POR QUE EXISTE] A tela de detalhe precisa dos dados do aluno.
// [PARA QUE SERVE] Renderizar progresso e switches corretos.
export function getAluno(id: string): AlunoDemo | undefined {
  return state.vinculados.find((a) => a.id === id);
}

// [O QUE FAZ] Liga/desliga o plano do professor (simulação).
// [POR QUE EXISTE] Permite demonstrar o gating de módulos.
// [PARA QUE SERVE] Com plano inativo, o professor não libera módulos.
export function togglePlano(): void {
  setState({ ...state, plano: { ...state.plano, ativo: !state.plano.ativo } });
}

// ----------------------------------------------------------------------------
// HOOK
// ----------------------------------------------------------------------------

// [O QUE FAZ] Hook que entrega o estado reativo às telas.
// [POR QUE EXISTE] Liga os componentes ao store externo.
// [PARA QUE SERVE] Qualquer mudança re-renderiza as telas que usam o store.
export function useDemoStore(): DemoState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
