/**
 * Integração da entrada serverless (formato usado na Vercel): a API NestJS real,
 * com o PostgreSQL, atendendo requisições HTTP pela função createServerlessHandler.
 */
import request = require('supertest');
import { DataSource } from 'typeorm';
import { createServerlessHandler } from '../src/serverless';

describe('Entrada serverless (Vercel) — integração', () => {
  const handler = createServerlessHandler();
  const email = `int.${Date.now()}.serverless@teste.local`;

  afterAll(async () => {
    await handler.close();
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'corretor_admin',
      password: process.env.DATABASE_PASSWORD || 'seguro_tech_2024',
      database: process.env.DATABASE_NAME || 'calendario_seguros',
    });
    await dataSource.initialize();
    await dataSource.query(`DELETE FROM users WHERE email = $1`, [email]);
    await dataSource.destroy();
  });

  it('atende as rotas da API com a mesma configuração de produção', async () => {
    await request(handler).get('/api/eventos').expect(401);

    const cadastro = await request(handler)
      .post('/api/auth/register')
      .send({ fullName: 'Usuária Serverless', email, password: 'senhaforte1' })
      .expect(201);

    const lista = await request(handler)
      .get('/api/eventos')
      .set('Authorization', `Bearer ${cadastro.body.accessToken}`)
      .expect(200);
    expect(lista.body).toEqual([]);
    expect(lista.headers['x-content-type-options']).toBe('nosniff'); // Helmet ativo
  });
});
