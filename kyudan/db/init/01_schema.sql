-- Kyu Dan: modelo fisico da arquitetura-alvo (PostgreSQL 16)
--
-- Segue o modelo logico da secao 4.8.3 do PGT. Em relacao ao prototipo
-- (versao 2.0 e versao congelada), inclui as lacunas que o texto aponta:
-- presenca por aula, historico de graduacoes, matricula em turmas, faixas
-- configuraveis por academia (RF-10), responsavel legal, consentimento e
-- trilha de auditoria (secao 4.10).

-- ACADEMIA: raiz do modelo multiacademia.
CREATE TABLE academies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  owner_name  TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  city        TEXT,
  state       TEXT,
  address     TEXT,
  modalities  TEXT[] NOT NULL DEFAULT ARRAY['judo'],
  status      TEXT NOT NULL DEFAULT 'ativa'
              CHECK (status IN ('ativa','trial','pendente','suspensa')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USUARIO. Perfis do PGT (administrador, gestor, mestre, professor autonomo,
-- aluno) mais o administrador supremo, decisao dos autores: conta unica da
-- equipe Kyu Dan que nao pode ser revogada e que concede e retira o acesso
-- dos demais administradores.
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL
                CHECK (role IN ('superadmin','admin','gestor','mestre','autonomo','aluno')),
  academy_id    UUID REFERENCES academies(id) ON DELETE SET NULL,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at    TIMESTAMPTZ,
  revoked_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  failed_logins INTEGER NOT NULL DEFAULT 0,   -- RF-01: tentativas consecutivas
  locked_until  TIMESTAMPTZ,                  -- RF-01: bloqueio temporario
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_um_superadmin ON users ((role)) WHERE role = 'superadmin';
ALTER TABLE users ADD CONSTRAINT superadmin_sempre_ativo
  CHECK (role <> 'superadmin' OR is_active);

-- MODALIDADE e FAIXA (secao 4.2). A sequencia de faixas e da plataforma;
-- os requisitos de cada faixa podem ser sobrescritos por academia (RF-10).
CREATE TABLE modalities (
  id               TEXT PRIMARY KEY,          -- 'judo', 'bjj'
  name             TEXT NOT NULL,
  federation       TEXT,
  progression_label TEXT                      -- 'kyu/dan', 'graus'
);

CREATE TABLE belts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modality_id      TEXT NOT NULL REFERENCES modalities(id),
  name             TEXT NOT NULL,
  color            TEXT NOT NULL DEFAULT '#ffffff',
  sort_order       INTEGER NOT NULL,
  -- Requisitos padrao para CHEGAR a esta faixa.
  min_classes      INTEGER NOT NULL DEFAULT 50,
  min_months       INTEGER NOT NULL DEFAULT 0,
  min_age          INTEGER,                   -- idade regulamentar: so alerta
  min_tech_pct     INTEGER NOT NULL DEFAULT 100 CHECK (min_tech_pct BETWEEN 0 AND 100),
  UNIQUE (modality_id, sort_order)
);

-- RF-10: requisitos configurados pela academia. Sem linha aqui, vale o padrao.
-- Graduacoes ja lancadas guardam os requisitos da epoca (tabela graduations),
-- entao uma mudanca so afeta os ciclos em andamento.
CREATE TABLE belt_settings (
  academy_id   UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  belt_id      UUID NOT NULL REFERENCES belts(id) ON DELETE CASCADE,
  min_classes  INTEGER NOT NULL CHECK (min_classes >= 0),
  min_months   INTEGER NOT NULL CHECK (min_months >= 0),
  min_age      INTEGER CHECK (min_age IS NULL OR min_age >= 0),
  min_tech_pct INTEGER NOT NULL CHECK (min_tech_pct BETWEEN 0 AND 100),
  updated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (academy_id, belt_id)
);

-- ALUNO (RF-02).
CREATE TABLE students (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id        UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  user_id           UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  birth_date        DATE,
  phone             TEXT,
  emergency_contact TEXT,
  terms_accepted_at TIMESTAMPTZ,              -- RF-02 passo 4
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INSCRICAO_MODALIDADE (RF-20): uma trilha independente por modalidade.
CREATE TABLE enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  modality_id TEXT NOT NULL REFERENCES modalities(id),
  belt_id     UUID NOT NULL REFERENCES belts(id),
  belt_since  DATE NOT NULL DEFAULT CURRENT_DATE,  -- data de obtencao da faixa atual
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, modality_id)
);

-- Responsavel legal do menor e consentimento (RF-22, art. 14 da LGPD).
CREATE TABLE guardians (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,  -- acesso previsto no RF-22
  name       TEXT NOT NULL,
  relation   TEXT,
  email      TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE consents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
  purpose     TEXT NOT NULL,
  granted     BOOLEAN NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TURMA (RF-11) e MATRICULA_TURMA.
CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  modality_id TEXT NOT NULL REFERENCES modalities(id),
  teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  weekdays    INTEGER[] NOT NULL DEFAULT '{}',   -- 0 = domingo ... 6 = sabado
  start_time  TIME,
  end_time    TIME,
  capacity    INTEGER CHECK (capacity IS NULL OR capacity > 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE class_enrollments (
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

-- AULA e PRESENCA (RF-03). Presenca e registro exclusivamente pedagogico:
-- nunca e bloqueada por situacao financeira (RF-17).
CREATE TABLE lessons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  theme_technique_id UUID,                     -- tecnica-tema da aula (RF-13)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, lesson_date)
);
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);
CREATE INDEX attendance_aluno ON attendance (student_id);

-- GRADUACAO: historico de exames (RF-05, RF-06), por inscricao.
CREATE TABLE graduations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id    UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  from_belt_id     UUID REFERENCES belts(id),
  to_belt_id       UUID NOT NULL REFERENCES belts(id),
  exam_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  result           TEXT NOT NULL CHECK (result IN ('aprovado','reprovado')),
  -- Retrato do ciclo no momento do exame.
  classes_attended INTEGER,
  classes_required INTEGER,
  months_in_belt   INTEGER,
  months_required  INTEGER,
  tech_pct         INTEGER,
  tech_pct_required INTEGER,
  was_flagged_apt  BOOLEAN NOT NULL,           -- a plataforma sinalizava apto?
  examiner_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TECNICA e PROGRESSO_TECNICO (RF-14, RF-15).
CREATE TABLE techniques (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modality_id          TEXT NOT NULL REFERENCES modalities(id),
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL,
  required_for_belt_id UUID REFERENCES belts(id) ON DELETE SET NULL,
  description          TEXT,
  video_url            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (modality_id, name)
);
CREATE TABLE skill_progress (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  technique_id   UUID NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'apresentada'
                 CHECK (status IN ('bloqueada','apresentada','em-treino','validada')),
  validated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at   DATE,
  professor_note TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, technique_id)
);

-- DIARIO_TREINO (RF-13, importante, fora do nucleo do MVP).
CREATE TABLE training_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  class_type TEXT NOT NULL DEFAULT 'coletiva'
             CHECK (class_type IN ('coletiva','particular','aberto','competicao')),
  free_notes TEXT,
  intensity  INTEGER DEFAULT 3 CHECK (intensity BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comunicados (RF-07).
CREATE TABLE announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  class_id   UUID REFERENCES classes(id) ON DELETE CASCADE,  -- nulo = toda a academia
  author_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ASSINATURA e FATURA (RF-08, importante). Sem campos de bloqueio: o RF-17
-- so sinaliza a gestao.
CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id        UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  monthly_value     NUMERIC(10,2) NOT NULL,
  due_day           INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28),
  grace_period_days INTEGER NOT NULL DEFAULT 5,
  method            TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('pix','cartao','boleto','manual')),
  status            TEXT NOT NULL DEFAULT 'ativa'
                    CHECK (status IN ('ativa','inadimplente','suspensa','cancelada')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  competence      TEXT NOT NULL,           -- AAAA-MM
  value           NUMERIC(10,2) NOT NULL,
  due_date        DATE NOT NULL,
  paid_at         DATE,
  status          TEXT NOT NULL DEFAULT 'aberta'
                  CHECK (status IN ('aberta','paga','vencida','cancelada')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, competence)
);

-- Trilha de auditoria (RNF-05, secao 4.10).
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action     TEXT NOT NULL,
  target     TEXT,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
