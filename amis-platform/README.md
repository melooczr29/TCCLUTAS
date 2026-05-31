# AMIS — Plataforma de Conexão e Gestão Pedagógica para Artes Marciais

> MVP comercial e projeto de TCC. Foco em Judô e Jiu-Jitsu.
> Backend Node.js/TypeScript + PostgreSQL · Mobile React Native (Expo) · Pagamentos Stripe.

![CI](https://github.com/melooczr29/TCCLUTAS/actions/workflows/ci.yml/badge.svg)
![Coverage](./backend/badges/coverage.svg)
![Node](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-Jest%20%2B%20Supertest%20%2B%20Testcontainers-C21325?logo=jest&logoColor=white)

> O badge de cobertura inicia como **pending** e é atualizado ao rodar
> `npm run test:coverage && npm run test:badge` (gera `backend/badges/coverage.svg`).

---

## 1. Resumo Executivo

A maioria dos sistemas de academias e dojos resume a tecnologia a uma **catraca**:
controlam apenas *quem entrou e quem pagou*. O **AMIS** parte de uma premissa
diferente — a de que artes marciais são, antes de tudo, uma **relação
pedagógica entre Sensei e Aluno**.

O diferencial do AMIS é transformar a presença em **dado pedagógico
confiável e antifraude** e conectar isso à **gestão financeira profissional**,
sem que o dojo precise se tornar uma empresa de tecnologia ou assumir riscos de
segurança de dados.

| Sistema "catraca" comum | AMIS |
| --- | --- |
| Presença = girar a catraca | Presença = **check-in assinado por QR Code** vinculado ao Sensei e à aula, à prova de fraude |
| Foco em portaria | Foco na **evolução do aluno** e na relação com o Sensei |
| Dados de cartão muitas vezes trafegando pelo sistema | **Zero custódia de cartão** — delegada à Stripe (PCI-DSS) |
| IDs sequenciais expostos | **UUIDv4** em todas as entidades (sem enumeração) |
| Pouca atenção à LGPD | Arquitetura **desenhada para LGPD** desde o schema |

O resultado é uma plataforma que serve igualmente ao **TCC** (excelência técnica
auditável) e ao **mercado** (MVP pronto para operar com segurança).

---

## 2. Arquitetura de Segurança & Conformidade (LGPD / OWASP / PCI-DSS)

Esta seção justifica tecnicamente cada decisão para auditoria da banca.

### 2.1 UUIDv4 em todas as chaves primárias
Usamos `@default(uuid())` em vez de IDs sequenciais (`autoincrement`). IDs
sequenciais permitem **enumeração de recursos** (um atacante que vê o usuário
`/users/42` tenta `/users/43`), facilitando ataques de **IDOR**
(*Insecure Direct Object Reference* — OWASP A01). UUIDs v4 são aleatórios e
não-adivinháveis, eliminando essa superfície.

### 2.2 Bcrypt para senhas (OWASP A02 — Cryptographic Failures)
Senhas **nunca** são armazenadas em texto puro. Aplicamos **Bcrypt** com
*cost factor* 12 (`AuthService`). O Bcrypt é deliberadamente lento e adiciona
um *salt* único por hash, inviabilizando *rainbow tables* e tornando a força
bruta economicamente impraticável. O campo persistido chama-se `passwordHash`
e jamais é retornado em respostas da API.

### 2.3 Zod — validação estrita de entrada (OWASP A03 — Injection)
Todo `body`, `params` e `query` passa por *schemas* **Zod** no middleware
`validate` antes de chegar ao controller. Isso:
- Rejeita **payloads malformados/maliciosos** e campos não declarados
  (mitiga *mass assignment*).
- Combinado às **queries parametrizadas do Prisma**, fecha a porta para
  **SQL Injection**: dados nunca são concatenados em SQL.
- Garante que o controller receba **dados já tipados e sanitizados**.

### 2.4 Pagamentos PCI-DSS Compliant (delegação de custódia à Stripe)
Este é o ponto mais sensível de um sistema financeiro. **O AMIS não vê, não
trafega e não armazena dados de cartão** (PAN, CVV, validade). O fluxo:

```
[Mobile] solicita cobrança
      │
      ▼
[Backend] cria PaymentIntent na Stripe  ──►  retorna apenas client_secret
      │
      ▼
[Mobile] @stripe/stripe-react-native abre a Payment Sheet nativa
      │  (o cartão é coletado e cifrado pela SDK da Stripe)
      ▼
[Stripe] processa o pagamento diretamente
      │
      ▼
[Backend] recebe o resultado via WEBHOOK assinado (fonte da verdade)
```

Localmente guardamos apenas referências **opacas**: `stripeCustomerId` (cliente
no gateway) e `gatewayRefId` (id do PaymentIntent). Com isso, **reduzimos
drasticamente o escopo PCI-DSS** do negócio: mesmo em caso de vazamento do nosso
banco, **não há dado de cartão a ser vazado**. A confirmação do pagamento vem do
**webhook assinado** (verificação por `stripe-signature` + segredo), nunca da
palavra do cliente.

### 2.5 Defesa em profundidade (demais camadas)
- **JWT + RBAC** (`authMiddleware`): autenticação com tratamento de expiração e
  autorização por papel (`ALUNO`/`SENSEI`/`GESTOR`). Rotas financeiras só são
  acessíveis ao `GESTOR`; geração de QR de presença só a `SENSEI`/`GESTOR`.
- **Helmet**: cabeçalhos HTTP seguros (mitiga XSS, clickjacking, MIME sniffing).
- **CORS restrito**: apenas origens da `whitelist` em `CORS_ORIGINS`.
- **Rate limiting**: limite global por IP e limite reforçado em `login`/`register`
  (anti força-bruta e DoS).
- **Handler global de erros**: respostas genéricas ao cliente; *stack traces* e
  erros do Prisma **nunca** vazam (OWASP A05). Logs internos não registram PII.
- **QR Token assinado (HMAC-SHA256)**: check-in inforjável, com expiração e
  comparação em tempo constante (anti *timing attack* e anti fraude de presença).
- **SecureStore no mobile**: o JWT é guardado no Keychain/Keystore cifrado, não
  em armazenamento em texto puro.

### 2.6 LGPD — princípios aplicados
- **Minimização de dados**: coletamos apenas o necessário (nome, e-mail,
  telefone opcional). Dados financeiros sensíveis ficam na Stripe.
- **Segurança por design**: criptografia de credenciais, controle de acesso e
  validação fazem parte da arquitetura, não de um remendo posterior.
- **Não exposição de PII em logs**: o logger é desenhado para registrar apenas
  identificadores não-sensíveis.
- **Segregação de segredos**: credenciais vivem em `.env` (fora do versionamento)
  e são validadas no boot (`config/env.ts`), em modelo *fail-fast*.

---

## 3. Estrutura do Monorepo

```
amis-platform/
├── .github/workflows/ci.yml    # (na raiz do repositório) CI: testes + typecheck
├── docker-compose.yml          # PostgreSQL + pgAdmin (rede isolada, healthcheck)
├── .env.example                # Variáveis da infraestrutura local
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Modelagem protegida (UUID, enums, índices)
│   │   └── seed.ts              # Dados de demonstração (idempotente)
│   ├── src/
│   │   ├── config/              # env (Zod), prisma, stripe, logger
│   │   ├── controllers/         # Auth, Presenca, Payment
│   │   ├── middlewares/         # authMiddleware (JWT+RBAC), validate, errorHandler
│   │   ├── routes/              # auth, presenca, payment, index
│   │   ├── schemas/             # Schemas Zod de validação
│   │   ├── services/            # AuthService, PaymentService, PresencaService
│   │   ├── utils/               # AppError, asyncHandler, jwt, qrToken
│   │   ├── types/               # Augmentação de tipos do Express
│   │   ├── app.ts               # Construção do app Express (testável)
│   │   └── server.ts            # Inicialização HTTP + shutdown gracioso
│   ├── tests/
│   │   ├── unit/                # Camada 1: unitários (Jest + mocks)
│   │   ├── integration/         # Camada 2: integração (Supertest)
│   │   ├── e2e/                 # Camada 3: E2E (Testcontainers + Postgres real)
│   │   │   ├── global-setup.ts      # Sobe o container e aplica o schema
│   │   │   ├── global-teardown.ts   # Derruba o container
│   │   │   ├── env-e2e.ts           # Injeta env + DATABASE_URL do container
│   │   │   ├── helpers.ts           # prisma + limpeza de banco
│   │   │   ├── auth.e2e.test.ts
│   │   │   └── presenca.e2e.test.ts
│   │   └── setup-env.ts         # Env fake para as camadas 1 e 2
│   ├── badges/coverage.svg      # Badge de cobertura (gerado por test:badge)
│   ├── jest.config.js           # Config das camadas 1 e 2
│   ├── jest.e2e.config.js       # Config da camada 3 (E2E)
│   ├── package.json
│   └── tsconfig.json
└── mobile/
    ├── App.tsx                  # Raiz + StripeProvider
    ├── src/
    │   ├── components/          # PrimaryButton, OutlineButton
    │   ├── screens/             # ProfileSelectionScreen
    │   ├── theme/               # Design tokens (paleta institucional)
    │   └── utils/               # api (axios), storage (SecureStore)
    ├── app.json
    └── package.json
```

---

## 4. Guia de Inicialização

### Pré-requisitos
- **Docker** e **Docker Compose**
- **Node.js 20+**
- Conta **Stripe** (chaves de teste `sk_test_` / `pk_test_`)

### Passo 1 — Subir o banco (PostgreSQL + pgAdmin)
Na raiz `amis-platform/`:
```bash
cp .env.example .env          # ajuste as senhas
docker compose up -d
```
- pgAdmin: <http://localhost:5050> (login conforme `.env`).

### Passo 2 — Backend
```bash
cd backend
cp .env.example .env          # ajuste DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY
npm install
npm run prisma:generate
npm run prisma:migrate        # cria as tabelas
npm run db:seed               # usuários de demo (senha: Amis@2026)
npm run dev                   # API em http://localhost:3333
```
Teste rápido: `GET http://localhost:3333/api/health`.

### Passo 3 — Mobile
```bash
cd ../mobile
cp .env.example .env          # ajuste EXPO_PUBLIC_API_URL e a chave publicável
npm install
npm run start                 # abre o Expo
```

### Usuários de demonstração (após o seed)
| Perfil | E-mail | Senha |
| --- | --- | --- |
| Gestor | `gestor@amis.local` | `Amis@2026` |
| Sensei | `sensei@amis.local` | `Amis@2026` |
| Aluno  | `aluno@amis.local`  | `Amis@2026` |

---

## 5. Principais Endpoints

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET`  | `/api/health` | público | Health check |
| `POST` | `/api/auth/register` | público | Cadastro (ALUNO/SENSEI) |
| `POST` | `/api/auth/login` | público | Login (retorna JWT) |
| `GET`  | `/api/auth/me` | autenticado | Perfil do usuário |
| `POST` | `/api/presencas/qr` | SENSEI/GESTOR | Gera QR Code assinado da aula |
| `POST` | `/api/presencas` | autenticado | Aluno registra a própria presença |
| `GET`  | `/api/presencas` | autenticado | Histórico de presenças |
| `POST` | `/api/pagamentos/intent` | GESTOR | Cria intenção de pagamento (client_secret) |
| `GET`  | `/api/pagamentos` | autenticado | Histórico de pagamentos |
| `POST` | `/api/pagamentos/webhook` | Stripe (assinado) | Atualização de status |

---

## 6. Ecossistema de Testes & CI

A confiabilidade é parte do argumento de defesa. A suíte é organizada em
**3 camadas** (pirâmide de testes), cada uma com um objetivo distinto.

### 6.1 As 3 camadas

**1) Unitários** — `tests/unit/` (rápidos, com mocks)
- `jwt` → assinatura, expiração e adulteração de token.
- `qrToken` → assinatura HMAC anti-fraude (válido / adulterado / expirado).
- `AppError` → status codes corretos.
- `AuthService` → hash da senha, não-vazamento do hash, anti user-enumeration.
- `PaymentService` → fluxo Stripe **mockado**, conversão p/ centavos, cliente
  idempotente, marcação de falha.

**2) Integração** — `tests/integration/` (Supertest, sem rede/DB)
- Health check, 404 padronizado, 401 (token ausente/inválido), 422 (Zod).

**3) E2E** — `tests/e2e/` (**Postgres REAL** via Testcontainers + Docker)
- `auth.e2e` → cadastro persiste, senha salva como **hash**, login + `/me`,
  bloqueio de e-mail duplicado.
- `presenca.e2e` → Sensei gera QR assinado, Aluno registra presença real,
  bloqueio de presença duplicada e **RBAC** (Aluno não gera QR → 403).

### 6.2 Como rodar

```bash
cd backend
npm install
npm run prisma:generate    # gera o Prisma Client (necessário p/ os testes)

npm test                   # camadas 1 e 2 (rápidas, sem Docker)
npm run test:coverage      # idem, com relatório de cobertura
npm run test:badge         # atualiza backend/badges/coverage.svg

npm run test:e2e           # camada 3 (exige Docker em execução)
```

> **Pré-requisito do E2E:** Docker ligado. O Testcontainers sobe um Postgres
> efêmero, aplica o schema (`prisma db push`) e o destrói ao final —
> **sem tocar** no seu banco de desenvolvimento.

### 6.3 Por que isso protege os dados (defesa para a banca)

| Risco | Como a suíte protege |
| --- | --- |
| Vazamento de senha | Teste E2E confirma que a senha é gravada **em hash**, nunca em texto puro, e que a API nunca devolve o hash. |
| Acesso indevido a funções | Testes de **RBAC** garantem que só SENSEI/GESTOR geram QR e só GESTOR cobra. |
| Fraude de presença | Testes do `qrToken` validam a assinatura HMAC, a expiração e a unicidade (sem presença duplicada). |
| Falha no pagamento (Stripe) | Testes do `PaymentService` cobrem sucesso, idempotência de cliente e marcação de **FALHOU** em erro — sem custodiar cartão. |
| Quebra silenciosa em produção | **CI** roda tipos + 3 camadas de teste a cada push/PR, barrando merge de código quebrado. |
| Corrupção de dados reais | O E2E usa um banco **descartável** (Testcontainers), provando o comportamento real sem risco aos dados. |

### 6.4 Integração Contínua
O workflow `.github/workflows/ci.yml` executa, a cada *push*/*pull request*,
**3 jobs**:
- **backend** → `install` → `prisma generate` → `prisma validate` →
  `typecheck` → `test:coverage`.
- **e2e** → `install` → `prisma generate` → `test:e2e` (Postgres real no Docker).
- **mobile** → `install` → `typecheck`.

> O `server.ts` foi separado do `app.ts` justamente para permitir testar a
> aplicação (Supertest/E2E) sem inicializar o servidor HTTP.

---

## 7. Stack Tecnológica

**Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, Zod, JWT,
Bcrypt, Helmet, express-rate-limit, Stripe SDK.

**Mobile:** React Native (Expo), TypeScript, Axios, Expo SecureStore,
`@stripe/stripe-react-native`.

**Infra local:** Docker Compose (PostgreSQL 16 + pgAdmin 4).

**Testes/Qualidade:** Jest, ts-jest, Supertest, Testcontainers (Postgres real),
coverage-badges-cli, GitHub Actions (CI).
