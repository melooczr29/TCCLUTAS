# Kyu Dan

Aplicativo de conexão e gestão para artes marciais. Projeto de Graduação em
Sistemas de Informação (ESPM), de Antonio Cesar Pereira Melo e João Pedro
Trigueiros Franco, orientado pelo Prof. Carlos Rafael Gimenes das Neves.

A ideia central do trabalho: a trilha de graduação é o eixo do sistema. Cada
presença registrada alimenta o indicador de aptidão do aluno à próxima faixa.

Esta pasta implementa a arquitetura-alvo descrita no capítulo 4 do PGT, com
servidor e banco de dados reais (o protótipo publicado guarda os dados no
navegador).

## Como rodar no VS Code

Você precisa de: Git, VS Code e Docker Desktop aberto.

1. Clone o repositório e abra a pasta `kyudan` no VS Code.
2. Copie `.env.example` para `.env` e troque os valores marcados com `TROQUE`.
   O e-mail e a senha do administrador supremo são definidos ali.
3. No terminal do VS Code:

   ```
   docker compose up --build
   ```

4. Abra http://localhost:8080 e entre com o e-mail e a senha do `.env`.

Na primeira subida o banco é criado, as faixas e técnicas padrão são
carregadas e, com `SEED_DEMO=true`, uma academia de demonstração é criada com
três logins (senha = `DEMO_PASSWORD`):

| Login                | Perfil |
|----------------------|--------|
| gestor@demo.kyudan   | Gestor |
| mestre@demo.kyudan   | Mestre |
| aluno@demo.kyudan    | Aluno  |

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

## Requisitos do PGT cobertos

| Requisito                                         | Situação nesta base |
|---------------------------------------------------|---------------------|
| RF-01 Autenticação com perfil                     | Implementado |
| RF-02 Cadastro de alunos                          | Implementado |
| RF-03 Presença por aula                           | Implementado (chamada; API aceita código do aluno) |
| RF-04 Aptidão como apoio à decisão                | Implementado |
| RF-05 Lançamento de exame                         | Implementado, com histórico |
| RF-06 Trilha de graduação                         | Implementado |
| RF-07 Avisos da academia                          | Implementado |
| RF-10 / RF-20 Faixas por modalidade               | Padrão da plataforma; tela de configuração pendente |
| RF-11 Turmas                                      | Implementado (criação e matrícula no cadastro) |
| RF-14 / RF-15 Árvore de habilidades e validação   | Implementado |
| RF-08 / RF-09 Mensalidades e indicadores          | Só tabelas e painel básico |
| RF-12, RF-13, RF-16, RF-18, RF-19, RF-21          | Pendentes |
| RF-17 Sinalização de inadimplência                | Pendente (a presença não é bloqueada) |
| RF-22 Responsável legal e consentimento           | Só tabelas |

Os números de aulas exigidas por faixa em `db/init/02_seed.sql` são valores
iniciais de exemplo e precisam ser definidos por cada academia.

## Antes de publicar na internet

Esta base está pronta para rodar na máquina. Para uso real ainda faltam:
HTTPS, limite de tentativas de login, troca de senha na tela, cópia de
segurança do banco e a revisão de LGPD descrita na seção 4.10 do PGT.
