// Executado a cada subida da API.
// 1. Garante a conta do administrador supremo a partir do .env.
// 2. Opcionalmente cria dados de demonstracao (SEED_DEMO=true), uma unica vez.
import bcrypt from 'bcryptjs';
import { q, one, audit } from './db.js';

export async function garantirSuperadmin() {
  const { SUPERADMIN_NAME: name, SUPERADMIN_EMAIL: email, SUPERADMIN_PASSWORD: password } = process.env;
  const existente = await one("SELECT id, email FROM users WHERE role = 'superadmin'");
  if (existente) return;
  if (!email || !password || password.length < 8) {
    throw new Error('Defina SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD (8+ caracteres) no arquivo .env.');
  }
  await q(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'superadmin')",
    [name || 'Administrador', email, await bcrypt.hash(password, 10)],
  );
  await audit(null, 'superadmin.criado', email);
  console.log(`Administrador supremo criado: ${email}`);
}

export async function semearDemo() {
  if (process.env.SEED_DEMO !== 'true') return;
  if (await one('SELECT 1 FROM academies LIMIT 1')) return;
  const senha = process.env.DEMO_PASSWORD;
  if (!senha || senha.length < 8) {
    console.warn('SEED_DEMO=true, mas DEMO_PASSWORD não foi definida (8+ caracteres). Demonstração ignorada.');
    return;
  }
  // Dados ficticios, apenas para demonstracao local.
  const hash = await bcrypt.hash(senha, 10);
  const acad = await one(
    `INSERT INTO academies (name, slug, owner_name, city, state, modalities)
     VALUES ('Dojo Demonstração','dojo-demo','Gestor Demo','São Paulo','SP',ARRAY['judo','bjj']) RETURNING id`,
  );
  const user = (nome, email, role) => one(
    'INSERT INTO users (name, email, password_hash, role, academy_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [nome, email, hash, role, acad.id],
  );
  await user('Gestor Demo', 'gestor@demo.kyudan', 'gestor');
  const mestre = await user('Mestre Demo', 'mestre@demo.kyudan', 'mestre');
  const alunoUser = await user('Aluno Demo', 'aluno@demo.kyudan', 'aluno');
  const turma = (nome, mod, dias, ini, fim) => one(
    `INSERT INTO classes (academy_id, name, modality_id, teacher_id, weekdays, start_time, end_time, capacity)
     VALUES ($1,$2,$3,$4,$5,$6,$7,30) RETURNING id`,
    [acad.id, nome, mod, mestre.id, dias, ini, fim],
  );
  const judo = await turma('Judô Adulto Noite', 'judo', '{1,3,5}', '19:00', '20:30');
  const bjj = await turma('Jiu-Jitsu Adulto', 'bjj', '{2,4}', '20:00', '21:30');
  const faixa1 = async (mod) => (await one('SELECT id FROM belts WHERE modality_id = $1 AND sort_order = 1', [mod])).id;
  const branca = { judo: await faixa1('judo'), bjj: await faixa1('bjj') };

  // Aulas dos ultimos 8 meses nos dias da turma.
  const aulas = async (classId, dias) => q(
    `INSERT INTO lessons (class_id, lesson_date)
     SELECT $1, d::date FROM generate_series(CURRENT_DATE - 240, CURRENT_DATE - 1, interval '1 day') d
      WHERE extract(dow FROM d)::int = ANY($2::int[]) RETURNING id, lesson_date`,
    [classId, dias],
  );
  const aulasJudo = await aulas(judo.id, [1, 3, 5]);
  const aulasBjj = await aulas(bjj.id, [2, 4]);

  const alunos = [
    { nome: 'Aluno Demo', nasc: '1998-04-10', user: alunoUser.id, meses: 7, freq: 0.6, bjj: true },
    { nome: 'Aluna Exemplo 2', nasc: '2001-09-21', meses: 7, freq: 0.5 },
    { nome: 'Aluno Exemplo 3', nasc: '1995-01-15', meses: 3, freq: 0.7 },
    { nome: 'Aluna Exemplo 4', nasc: '2003-06-30', meses: 8, freq: 0.25 },
  ];
  for (const a of alunos) {
    const s = await one(
      `INSERT INTO students (academy_id, user_id, name, birth_date, terms_accepted_at)
       VALUES ($1,$2,$3,$4,now()) RETURNING id`,
      [acad.id, a.user || null, a.nome, a.nasc],
    );
    const desde = new Date(Date.now() - a.meses * 30.5 * 864e5).toISOString().slice(0, 10);
    const inscrever = async (mod, classId, lista, freq) => {
      await q('INSERT INTO enrollments (student_id, modality_id, belt_id, belt_since) VALUES ($1,$2,$3,$4)',
        [s.id, mod, branca[mod], desde]);
      await q('INSERT INTO class_enrollments (class_id, student_id) VALUES ($1,$2)', [classId, s.id]);
      const presentes = lista.filter((l, i) => l.lesson_date >= desde && (i % 10) < freq * 10);
      for (const l of presentes) {
        await q('INSERT INTO attendance (lesson_id, student_id, recorded_by) VALUES ($1,$2,$3)', [l.id, s.id, mestre.id]);
      }
    };
    await inscrever('judo', judo.id, aulasJudo, a.freq);
    if (a.bjj) await inscrever('bjj', bjj.id, aulasBjj, 0.5);
  }
  await q(
    "INSERT INTO announcements (academy_id, author_id, title, body) VALUES ($1,$2,'Bem-vindos ao Kyu Dan','Este é um aviso de demonstração.')",
    [acad.id, mestre.id],
  );
  console.log('Dados de demonstração criados (academia "Dojo Demonstração").');
}
