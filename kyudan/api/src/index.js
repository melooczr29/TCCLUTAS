// Kyu Dan API: camada de servicos de aplicacao (rotas, validacao, acesso).
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './db.js';
import { autenticar } from './auth.js';
import { garantirSuperadmin, semearDemo } from './bootstrap.js';
import auth from './routes/auth.js';
import usuarios from './routes/usuarios.js';
import academias from './routes/academias.js';
import alunos from './routes/alunos.js';
import turmas from './routes/turmas.js';
import geral from './routes/geral.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('Defina JWT_SECRET (16+ caracteres) no arquivo .env.');
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});
app.use('/api/auth', auth);
app.use('/api/usuarios', autenticar, usuarios);
app.use('/api/academias', autenticar, academias);
app.use('/api/alunos', autenticar, alunos);
app.use('/api/turmas', autenticar, turmas);
app.use('/api', autenticar, geral);

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.code === '22P02') return res.status(400).json({ error: 'Identificador inválido.' });
  if (err.code === '23514' || err.code === '23503') return res.status(400).json({ error: 'Dados inválidos.' });
  console.error(err);
  res.status(500).json({ error: 'Erro interno.' });
});

async function iniciar() {
  for (let i = 1; ; i++) { // espera o banco ficar pronto
    try { await pool.query('SELECT 1'); break; } catch (e) {
      if (i >= 30) throw e;
      await new Promise((ok) => setTimeout(ok, 1000));
    }
  }
  await garantirSuperadmin();
  await semearDemo();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Kyu Dan API ouvindo na porta ${port}`));
}
iniciar().catch((e) => { console.error(e.message); process.exit(1); });
