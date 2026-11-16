// Camada de persistencia: unico ponto de acesso ao PostgreSQL.
import pg from 'pg';

pg.types.setTypeParser(1082, (v) => v); // DATE como texto AAAA-MM-DD
pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT/COUNT como numero

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function q(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}
export async function one(text, params) {
  return (await q(text, params))[0] ?? null;
}
export async function audit(actor, action, target, details) {
  await q(
    'INSERT INTO audit_log (actor_id, actor_name, action, target, details) VALUES ($1,$2,$3,$4,$5)',
    [actor?.id ?? null, actor?.name ?? 'sistema', action, target ?? null, details ?? null],
  );
}
