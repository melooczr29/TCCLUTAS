// Regras de negocio: quem pode criar, revogar ou excluir quem.
//
//   superadmin  administrador supremo. Unico. Ve tudo e todos. Ninguem,
//               nem ele mesmo, consegue revogar, rebaixar ou excluir essa conta.
//   admin       equipe Kyu Dan. Ve todas as academias, mas so existe enquanto
//               o superadmin quiser: so ele cria, revoga, reativa e exclui admins.
//   gestor      administra a propria academia.
//   mestre / autonomo / aluno   sem poder sobre contas.
import { HttpError } from '../auth.js';

const CRIAVEIS = {
  superadmin: ['admin', 'gestor', 'mestre', 'autonomo', 'aluno'],
  admin: ['gestor', 'mestre', 'autonomo', 'aluno'],
  gestor: ['mestre', 'aluno'],
};

export function podeCriar(ator, novoPerfil) {
  if (!(CRIAVEIS[ator.role] || []).includes(novoPerfil)) {
    throw new HttpError(403, `Seu perfil não pode criar usuários do tipo "${novoPerfil}".`);
  }
}

// Vale para revogar, reativar, alterar e excluir.
export function podeGerenciar(ator, alvo) {
  if (alvo.role === 'superadmin') {
    throw new HttpError(403, 'A conta do administrador supremo não pode ser alterada.');
  }
  if (alvo.id === ator.id) {
    throw new HttpError(400, 'Você não pode alterar o próprio acesso.');
  }
  if (ator.role === 'superadmin') return;
  if (ator.role === 'admin' && alvo.role !== 'admin') return;
  if (
    ator.role === 'gestor' &&
    ['mestre', 'aluno'].includes(alvo.role) &&
    alvo.academy_id === ator.academy_id
  ) {
    return;
  }
  throw new HttpError(403, 'Você não tem permissão para gerenciar este usuário.');
}
