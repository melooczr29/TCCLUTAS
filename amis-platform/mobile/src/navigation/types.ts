/**
 * ============================================================================
 * navigation/types — Tipos das rotas de navegação
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Declara as rotas e os parâmetros aceitos por cada tela.
 * [POR QUE EXISTE]  O react-navigation tipado evita navegar para rota errada.
 * [PARA QUE SERVE]  Dá autocomplete e segurança ao chamar navigation.navigate.
 * ============================================================================
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Role } from '../api/types';

// [O QUE FAZ] Mapeia cada rota aos seus parâmetros (undefined = sem params).
// [POR QUE EXISTE] É a "fonte da verdade" das rotas do app.
// [PARA QUE SERVE] Tipar telas e navegação de ponta a ponta.
export type RootStackParamList = {
  ProfileSelection: undefined;
  Login: { role?: Role } | undefined;
  Register: { role?: Role } | undefined;
  Home: undefined;
  PresencaAluno: undefined;
  SenseiQr: undefined;
  Pagamentos: undefined;
  VinculoProfessor: undefined;
  SenseiAlunos: undefined;
  DetalheAluno: { alunoId: string };
  AlunoVideos: undefined;
};

// [O QUE FAZ] Atalho de tipo para as props de cada tela.
// [POR QUE EXISTE] Reduz verbosidade ao declarar componentes de tela.
// [PARA QUE SERVE] Ex.: ScreenProps<'Login'> já traz navigation e route tipados.
export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
