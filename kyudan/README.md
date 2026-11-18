# Kyu Dan

Aplicativo de conexão e gestão para artes marciais. Projeto de Graduação em
Sistemas de Informação (ESPM), de Antonio Cesar Pereira Melo e João Pedro
Trigueiros Franco, orientado pelo Prof. Carlos Rafael Gimenes das Neves.

A ideia central do trabalho: a trilha de graduação é o eixo do sistema. Cada
presença registrada alimenta o indicador de aptidão do aluno à próxima faixa.

Esta pasta implementa a **arquitetura-alvo** descrita na seção 4.8 do PGT
(Figura 22): React, API REST em Node.js/Express e PostgreSQL, cada um em seu
contêiner. Ela **não é o protótipo da defesa**. O protótipo apresentado à banca
é o publicado em https://kyu-dan.vercel.app (React + Supabase), congelado em
16/11/2026 conforme o Apêndice F. Esta base fica como evolução posterior, nos
trabalhos futuros, e não deve ser citada como já existente no texto do TCC.

## Como rodar no VS Code

Você precisa de: Git, VS Code e Docker Desktop aberto.

1. Clone o repositório e abra a pasta `kyudan` no VS Code.
2. Copie `.env.example` para `.env` e troque os valores marcados com `TROQUE`.
   O e-mail e a senha do administrador supremo são definidos ali.
3. No terminal do VS Code:

   ```
   docker compose up --build
   ```

4. Abra http://localhost:8090 e entre com o e-mail e a senha do `.env`.

Na primeira subida o banco é criado, as faixas e técnicas padrão são
carregadas e, com `SEED_DEMO=true`, uma academia de demonstração é criada com
três logins (senha = `DEMO_PASSWORD`):

| Login                | Perfil |
|----------------------|--------|
| gestor@demo.kyudan   | Gestor |
| mestre@demo.kyudan   | Mestre |
| aluno@demo.kyudan    | Aluno  |

Os alunos de demonstração são fictícios.

Atalhos: `Ctrl+Shift+P` > `Tasks: Run Task` lista as tarefas "Kyu Dan".
Para apagar tudo e recomeçar: `docker compose down -v`.

### Desenvolvimento com recarga automática

Com o banco no ar (`docker compose up db`), em dois terminais:

```
cd api && npm install && npm run dev      # API em http://localhost:3000
cd web && npm install && npm run dev      # tela em http://localhost:5173
```

Nesse modo, tire o `#` da linha `DATABASE_URL` no fim do `.env`.

## Estrutura

```
kyudan/
  docker-compose.yml   3 contêineres: web, api, db
  db/init/             modelo físico e dados iniciais (PostgreSQL 16)
  api/                 Node.js + Express
    src/routes/        serviços de aplicação (rotas, validação, acesso)
    src/rules/         regras de negócio (aptidão, acessos)
    src/db.js          persistência
  web/                 React + Vite, servido por Nginx
```

## Perfis e acessos

| Perfil                 | O que enxerga                                   |
|------------------------|--------------------------------------------------|
| Administrador supremo  | Tudo e todos, mais a auditoria                   |
| Administrador          | Todas as academias e usuários                    |
| Gestor                 | A própria academia                               |
| Mestre / autônomo      | Alunos, turmas e chamada da própria academia     |
| Aluno                  | A própria trilha e os avisos                     |

Regras do administrador supremo:

- Só existe 1, e o próprio banco impede um segundo.
- A conta não pode ser revogada, rebaixada nem excluída, por ninguém.
- Só ele cria, revoga, reativa e exclui administradores.
- Uma revogação vale na hora: a pessoa é desconectada no próximo clique.
- Tudo fica registrado na tela Auditoria.

Para dar acesso ao João: entrar como supremo, abrir Acessos, criar um acesso
com perfil Administrador. Para tirar: botão "Revogar acesso" na mesma tela.

## Requisitos do PGT nesta base

Situação nesta base (não confundir com a Tabela 35, que descreve o protótipo).

| Requisito | Situação | Observação |
|-----------|----------|------------|
| RF-01 Autenticação | Implementado | Perfil identificado no cadastro; bloqueio de 15 min após 5 tentativas |
| RF-02 Cadastro de aluno | Implementado | Responsável obrigatório para menor; acesso próprio a partir de 12 anos; aceite do termo |
| RF-03 Presença por aula | Parcial | Registro por aula e busca na lista; sem fila local offline (RNF-07) |
| RF-04 Aptidão | Implementado | 3 requisitos (presenças, tempo na faixa, técnicas); idade mínima como alerta |
| RF-05 Exame | Implementado | Reprovação reinicia o ciclo; aprovação de não sinalizado pede confirmação e vai para a auditoria |
| RF-06 Trilha | Implementado | Faixas com datas, requisitos e histórico de exames |
| RF-07 Avisos | Parcial | Turma ou academia; entrega a responsáveis depende do RF-22 |
| RF-08 Mensalidades | Previsto | Só as tabelas |
| RF-09 Indicadores | Parcial | Contagens básicas no painel |
| RF-10 Faixas e modalidades | Parcial | Requisitos por academia; a sequência de faixas é da plataforma |
| RF-11 Turmas | Implementado | Capacidade, mestre responsável e aviso de conflito de horário |
| RF-12, RF-13, RF-16, RF-18, RF-19, RF-21 | Previstos | |
| RF-14 Árvore de habilidades | Implementado | Agrupada por categoria |
| RF-15 Validação técnica | Implementado | Só professor; o aluno não consegue se validar |
| RF-17 Inadimplência | Previsto | A presença nunca é bloqueada |
| RF-20 Progressões por modalidade | Implementado | Uma trilha por modalidade, inclusive com graduação externa |
| RF-22 Responsável legal | Parcial | Responsável registrado no cadastro; sem acesso próprio nem consentimento |

Também da seção 4.10: o mestre só vê os alunos das turmas dele, e as ações
sensíveis ficam na trilha de auditoria. A presença por leitura de código no
tatame ficou de fora, como na seção 4.1.

Os requisitos de cada faixa em `db/init/02_seed.sql` são valores de exemplo,
não vêm do PGT. Cada academia ajusta os seus na tela Faixas e requisitos.

## Antes de publicar na internet

Esta base está pronta para rodar na máquina. Para uso real ainda faltam:
HTTPS, limite de tentativas de login, troca de senha na tela, cópia de
segurança do banco e a revisão de LGPD descrita na seção 4.10 do PGT.
