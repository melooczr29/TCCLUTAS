/**
 * Testes de integração HTTP com Supertest (sem porta de rede e sem banco real).
 * O wrapper do Prisma é mockado para garantir que estas rotas NÃO dependam de
 * um banco — todas elas respondem antes de qualquer acesso a dados.
 *
 * Cobrem: health check, 404, autenticação ausente (401) e validação Zod (422).
 */
jest.mock('../../src/config/prisma', () => ({ prisma: {} }));

import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('AMIS API (integração)', () => {
  it('GET /api/health responde 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rota inexistente responde 404 padronizado', async () => {
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('rota protegida sem token responde 401', async () => {
    const res = await request(app).get('/api/presencas');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_MISSING');
  });

  it('registro com payload inválido responde 422 (validação Zod)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalido', senha: '123' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('token malformado responde 401', async () => {
    const res = await request(app)
      .get('/api/presencas')
      .set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });
});
