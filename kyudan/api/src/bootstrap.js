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
  const hash = await bcrypt.hash(senha, 10);
  const acad = await one(
    `INSERT INTO academies (name, slug, owner_name, city, state, modalities)
     VALUES ('Dojo Demonstração','dojo-demo','Gestor Demo','São Paulo','SP',ARRAY['judo']) RETURNING id`,
  );
  const user = (nome, email, role) => one(
    'INSERT INTO users (name, email, password_hash, role, academy_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [nome, email, hash, role, acad.id],
  );
  await user('Gestor Demo', 'gestor@demo.kyudan', 'gestor');
  const mestre = await user('Mestre Demo', 'mestre@demo.kyudan', 'mestre');
  const alunoUser = await user('Aluno Demo', 'aluno@demo.kyudan', 'aluno');
  const turma = await one(
    `INSERT INTO classes (academy_id, name, modality_id, teacher_id, weekdays, start_time, end_time)
     VALUES ($1,'Judô Adulto Noite','judo',$2,'{1,3,5}','19:00','20:30') RETURNING id`,
    [acad.id, mestre.id],
  );
  const branca = await one("SELECT id FROM belts WHERE academy_id IS NULL AND modality_id='judo' AND sort_order=1");
  const nomes = ['Aluno Demo', 'Aluna Exemplo 2', 'Aluno Exemplo 3', 'Aluna Exemplo 4', 'Aluno Exemplo 5'];
  for (const [i, nome] of nomes.entries()) {
    const s = await one(
      'INSERT INTO students (academy_id, user_id, name, modality_id, belt_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [acad.id, i === 0 ? alunoUser.id : null, nome, 'judo', branca.id],
    );
    await q('INSERT INTO class_enrollments (class_id, student_id) VALUES ($1,$2)', [turma.id, s.id]);
    // Presencas ficticias em dias distintos, para a aptidao ter o que mostrar.
    await q(
      `INSERT INTO attendance (class_id, student_id, class_date, recorded_by)
       SELECT $1, $2, CURRENT_DATE - n, $3 FROM generate_series(1, $4) AS n`,
      [turma.id, s.id, mestre.id, 42 - i * 9],
    );
  }
  await q(
    "INSERT INTO announcements (academy_id, author_id, title, body) VALUES ($1,$2,'Bem-vindos ao Kyu Dan','Este é um aviso de demonstração.')",
    [acad.id, mestre.id],
  );
  console.log('Dados de demonstração criados (academia "Dojo Demonstração").');
}
