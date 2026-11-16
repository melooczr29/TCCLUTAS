-- Kyu Dan: modelo fisico (PostgreSQL 16)
-- Base: tabelas do prototipo (academies, users, students, techniques,
-- skill_progress, training_logs, subscriptions, invoices) mais as lacunas
-- apontadas no PGT: presenca aula a aula, historico de graduacoes, matricula
-- em turmas, responsavel legal, consentimento e auditoria.

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

-- Perfis: superadmin (administrador supremo, unico), admin (equipe Kyu Dan,
-- acesso revogavel pelo superadmin), gestor, mestre, autonomo e aluno.
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
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- So pode existir 1 administrador supremo, e ele nunca fica inativo.
CREATE UNIQUE INDEX users_um_superadmin ON users ((role)) WHERE role = 'superadmin';
ALTER TABLE users ADD CONSTRAINT superadmin_sempre_ativo
  CHECK (role <> 'superadmin' OR is_active);

-- Faixas e progressao por modalidade (RF-10, RF-20).
-- academy_id nulo = padrao da plataforma; preenchido = configuracao da academia.
CREATE TABLE belts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id       UUID REFERENCES academies(id) ON DELETE CASCADE,
  modality_id      TEXT NOT NULL,
  name             TEXT NOT NULL,
  color            TEXT NOT NULL DEFAULT '#ffffff',
  sort_order       INTEGER NOT NULL,
  required_classes INTEGER NOT NULL DEFAULT 50,
  UNIQUE NULLS NOT DISTINCT (academy_id, modality_id, sort_order)
);

CREATE TABLE students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  user_id     UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  birth_date  DATE,
  phone       TEXT,
  modality_id TEXT NOT NULL DEFAULT 'judo',
  belt_id     UUID REFERENCES belts(id),
  qr_token    TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Responsavel legal do aluno menor e consentimento (RF-22, LGPD).
CREATE TABLE guardians (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
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

-- Turmas (RF-11) e matricula em turmas.
CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  modality_id TEXT NOT NULL DEFAULT 'judo',
  teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  weekdays    INTEGER[] NOT NULL DEFAULT '{}',   -- 0 = domingo ... 6 = sabado
  start_time  TIME,
  end_time    TIME,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE class_enrollments (
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

-- Presenca aula a aula (RF-03). Registro exclusivamente pedagogico.
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  method      TEXT NOT NULL DEFAULT 'chamada' CHECK (method IN ('chamada','qr')),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id, class_date)
);
CREATE INDEX attendance_aluno_data ON attendance (student_id, class_date);

-- Historico de exames de graduacao (RF-05, RF-06).
CREATE TABLE graduations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_belt_id     UUID REFERENCES belts(id),
  to_belt_id       UUID NOT NULL REFERENCES belts(id),
  exam_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  result           TEXT NOT NULL CHECK (result IN ('aprovado','reprovado')),
  classes_attended INTEGER,
  classes_required INTEGER,
  examiner_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Arvore de habilidades (RF-14) e validacao pelo professor (RF-15).
CREATE TABLE techniques (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modality_id          TEXT NOT NULL,
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

-- Diario de treino (RF-13, fora do nucleo do MVP).
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

-- Avisos na caixa de entrada da academia (RF-07).
CREATE TABLE announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  class_id   UUID REFERENCES classes(id) ON DELETE CASCADE,  -- nulo = toda a academia
  author_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mensalidades (RF-08, fora do nucleo do MVP). Sem bloqueio de presenca (RF-17).
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  monthly_value NUMERIC(10,2) NOT NULL,
  due_day       INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28),
  method        TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('pix','cartao','boleto','manual')),
  status        TEXT NOT NULL DEFAULT 'ativa'
                CHECK (status IN ('ativa','inadimplente','suspensa','cancelada')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- Trilha de auditoria (LGPD e controle de acessos).
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action     TEXT NOT NULL,
  target     TEXT,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
