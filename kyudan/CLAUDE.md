# Kyu Dan: guia para o Claude Code

Projeto de TCC (ESPM, Sistemas de Informação). Plataforma de gestão para
academias de artes marciais em que a presença alimenta a aptidão à próxima faixa.

Esta base é a arquitetura-alvo da seção 4.8 do PGT, não o protótipo da defesa
(kyu-dan.vercel.app, congelado). O PGT é a fonte da verdade: não criar
funcionalidade sem requisito no texto. Fora do MVP (seção 4.1): presença por
QR Code, clube de benefícios, simulador, publicador de conteúdo.

## Comandos
- Subir tudo: `docker compose up --build` (web em :8090, api em :3010, db em :5433; portas definidas no .env)
- API com recarga: `cd api && npm run dev` (lê `../.env`)
- Web com recarga: `cd web && npm run dev` (proxy de /api para :3000)
- Ao mudar o schema em `db/init`, o banco precisa ser zerado: `docker compose down -v`
- Zerar o banco: `docker compose down -v`

## Arquitetura
- `db/init/*.sql`: modelo físico. Só roda em banco vazio; ao mudar o schema, zere o volume ou escreva uma migração.
- `api/src/routes`: rotas Express. Toda rota usa `rota()` e valida a academia com `academiaDoPedido` ou `exigirMesmaAcademia`.
- `api/src/rules`: regras de negócio puras (`aptidao.js`, `acessos.js`). Regra de domínio nova entra aqui, não na rota.
- `web/src/paginas.jsx`: uma função por tela. O menu por perfil fica em `App.jsx`.

## Regras que não podem ser quebradas
- Perfis: superadmin, admin, gestor, mestre, autonomo, aluno.
- O superadmin é único e intocável (índice único e CHECK no banco, mais `rules/acessos.js`).
- Só o superadmin gerencia contas admin.
- Todo dado é isolado por `academy_id`; só superadmin e admin cruzam academias.
- A aptidão usa 3 requisitos (RF-04) e é apoio à decisão. Aprovar quem não está sinalizado exige confirmação e entra na auditoria (RF-05), nunca é bloqueado.
- Cada modalidade é uma inscrição própria (RF-20). Presença conta só para a modalidade da turma.
- O mestre só vê alunos e turmas sob sua responsabilidade (seção 4.10).
- Conta de aluno nasce só pelo cadastro do aluno (RF-02).
- Presença é registro pedagógico. Nunca bloquear presença por inadimplência (RF-17).
- Não usar nomes de plano nem preço fixo: a cobrança é por aluno ativo (Tabela 1 do PGT).

## Estilo
- Português nos textos de tela, mensagens de erro e comentários.
- Sem emojis. Interface sóbria.
- Segredos só no `.env`, que não vai para o Git.
