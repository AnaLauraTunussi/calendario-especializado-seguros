/**
 * Testes de integração da API: sobem a aplicação NestJS completa (mesma configuração
 * de produção via configureApp) e fazem requisições HTTP reais contra o PostgreSQL.
 *
 * Pré-requisito: banco no ar (docker compose up -d db).
 * Os dados criados aqui usam e-mails "int.*@teste.local" e são apagados ao final.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { todayInAppTimezone } from '../src/appointments/appointment-categories';

const RUN = Date.now();
const emailA = `int.${RUN}.a@teste.local`;
const emailB = `int.${RUN}.b@teste.local`;
const PASSWORD = 'senhaforte1';

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

describe('API — integração (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let http: any;
  let tokenA: string;
  let tokenB: string;
  const today = todayInAppTimezone();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    // remove os usuários de teste (os compromissos saem em cascata)
    await app.get(DataSource).query(`DELETE FROM users WHERE email LIKE 'int.%@teste.local'`);
    await app.close();
  });

  describe('Autenticação', () => {
    it('POST /api/auth/register cria a conta e devolve o token, sem o hash da senha', async () => {
      const res = await request(http)
        .post('/api/auth/register')
        .send({ fullName: 'Usuária A', email: emailA, password: PASSWORD })
        .expect(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: emailA, fullName: 'Usuária A' });
      expect(JSON.stringify(res.body)).not.toContain('password');
      tokenA = res.body.accessToken;

      const resB = await request(http)
        .post('/api/auth/register')
        .send({ fullName: 'Usuário B', email: emailB, password: PASSWORD })
        .expect(201);
      tokenB = resB.body.accessToken;
    });

    it('recusa e-mail já cadastrado (409) e dados inválidos (400)', async () => {
      await request(http).post('/api/auth/register').send({ fullName: 'Outra', email: emailA, password: PASSWORD }).expect(409);
      const res = await request(http)
        .post('/api/auth/register')
        .send({ fullName: 'Ab', email: 'nao-e-email', password: '123' })
        .expect(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('e-mail válido')]));
    });

    it('POST /api/auth/login autentica e recusa senha errada com mensagem genérica', async () => {
      await request(http).post('/api/auth/login').send({ email: emailA, password: PASSWORD }).expect(200);
      const res = await request(http).post('/api/auth/login').send({ email: emailA, password: 'errada123' }).expect(401);
      expect(res.body.message).toBe('Credenciais inválidas.');
    });

    it('GET /api/auth/profile exige token válido', async () => {
      const res = await request(http).get('/api/auth/profile').set(auth(tokenA)).expect(200);
      expect(res.body).toMatchObject({ email: emailA, fullName: 'Usuária A' });
      await request(http).get('/api/auth/profile').expect(401);
      await request(http).get('/api/auth/profile').set(auth('token.invalido.xyz')).expect(401);
    });
  });

  describe('Segurança da API', () => {
    it('envia cabeçalhos de segurança (Helmet) e não expõe o servidor', async () => {
      const res = await request(http).get('/api/eventos').set(auth(tokenA)).expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('libera CORS só para a origem do frontend', async () => {
      const ok = await request(http).get('/api/eventos').set(auth(tokenA)).set('Origin', 'http://localhost:4200');
      expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:4200');
      const bloqueado = await request(http).get('/api/eventos').set(auth(tokenA)).set('Origin', 'http://site-malicioso.com');
      expect(bloqueado.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('rejeita campos não previstos (minimização de dados — LGPD)', async () => {
      const res = await request(http)
        .post('/api/eventos')
        .set(auth(tokenA))
        .send({ title: 'X', clientName: 'Y', category: 'Renewal', appointmentDate: '2026-12-10', cpf: '12345678900' })
        .expect(400);
      expect(JSON.stringify(res.body)).not.toContain('stack');
    });
  });

  describe('Compromissos', () => {
    let alertaId: string;
    let futuroId: string;
    let hojeId: string;

    it('POST /api/eventos cria com ícone, rótulo e data de alerta calculados', async () => {
      const res = await request(http)
        .post('/api/eventos')
        .set(auth(tokenA))
        .send({ title: 'Vistoria Auto', clientName: 'João', category: 'Inspection', appointmentDate: addDays(today, 3), alertLeadDays: 30 })
        .expect(201);
      expect(res.body).toMatchObject({
        accessibleIcon: 'pi-search',
        accessibleLabel: 'Vistoria',
        alertTriggerDate: addDays(today, -27),
        isCompleted: false,
      });
      alertaId = res.body.id;

      futuroId = (
        await request(http)
          .post('/api/eventos')
          .set(auth(tokenA))
          .send({ title: 'Reunião futura', clientName: 'Ana', category: 'Meeting', appointmentDate: addDays(today, 60), appointmentTime: '14:30', alertLeadDays: 10 })
          .expect(201)
      ).body.id;

      hojeId = (
        await request(http)
          .post('/api/eventos')
          .set(auth(tokenA))
          .send({ title: 'Sinistro de hoje', clientName: 'Bia', category: 'Claim', appointmentDate: today })
          .expect(201)
      ).body.id;
    });

    it('PATCH /concluir no dia agendado conclui direto', async () => {
      const res = await request(http).patch(`/api/eventos/${hojeId}/concluir`).set(auth(tokenA)).expect(200);
      expect(res.body.isCompleted).toBe(true);
    });

    it('GET /api/eventos ordena por prioridade: alerta ativo, pendente, concluído', async () => {
      const res = await request(http).get('/api/eventos').set(auth(tokenA)).expect(200);
      expect(res.body.map((a: { id: string }) => a.id)).toEqual([alertaId, futuroId, hojeId]);
    });

    it('GET /api/eventos/alertas traz só pendentes com alerta disparado', async () => {
      const res = await request(http).get('/api/eventos/alertas').set(auth(tokenA)).expect(200);
      expect(res.body.map((a: { id: string }) => a.id)).toEqual([alertaId]);
    });

    it('filtra por categoria e recusa filtro inválido', async () => {
      const res = await request(http).get('/api/eventos?category=Meeting').set(auth(tokenA)).expect(200);
      expect(res.body.map((a: { id: string }) => a.id)).toEqual([futuroId]);
      await request(http).get('/api/eventos?isCompleted=talvez').set(auth(tokenA)).expect(400);
    });

    it('GET /api/eventos/:id: 200 para o dono, 404 inexistente, 400 id inválido, 403 outro usuário', async () => {
      await request(http).get(`/api/eventos/${alertaId}`).set(auth(tokenA)).expect(200);
      await request(http).get('/api/eventos/00000000-0000-4000-8000-000000000000').set(auth(tokenA)).expect(404);
      await request(http).get('/api/eventos/abc').set(auth(tokenA)).expect(400);
      await request(http).get(`/api/eventos/${alertaId}`).set(auth(tokenB)).expect(403);
    });

    it('PUT atualiza para "Outros" com tipo personalizado e não permite concluir pela edição', async () => {
      const res = await request(http)
        .put(`/api/eventos/${futuroId}`)
        .set(auth(tokenA))
        .send({ category: 'Other', accessibleLabel: 'Cobrança', appointmentTime: null })
        .expect(200);
      expect(res.body).toMatchObject({ category: 'Other', accessibleIcon: 'pi-tag', accessibleLabel: 'Cobrança', appointmentTime: null });
      await request(http).put(`/api/eventos/${futuroId}`).set(auth(tokenA)).send({ isCompleted: true }).expect(400);
    });

    it('PATCH /concluir fora da data exige confirmação (422 sem ela, 200 com ela)', async () => {
      const recusado = await request(http).patch(`/api/eventos/${futuroId}/concluir`).set(auth(tokenA)).expect(422);
      expect(recusado.body.message).toContain('ainda não chegou');
      await request(http).patch(`/api/eventos/${futuroId}/concluir`).set(auth(tokenA)).send({ confirmarForaDaData: 'sim' }).expect(400);
      const res = await request(http)
        .patch(`/api/eventos/${futuroId}/concluir`)
        .set(auth(tokenA))
        .send({ confirmarForaDaData: true })
        .expect(200);
      expect(res.body.isCompleted).toBe(true);
    });

    it('outro usuário não conclui nem exclui compromisso alheio (403)', async () => {
      await request(http).patch(`/api/eventos/${alertaId}/concluir`).set(auth(tokenB)).send({ confirmarForaDaData: true }).expect(403);
      await request(http).delete(`/api/eventos/${alertaId}`).set(auth(tokenB)).expect(403);
      const listaB = await request(http).get('/api/eventos').set(auth(tokenB)).expect(200);
      expect(listaB.body).toEqual([]);
    });

    it('DELETE remove o compromisso e ele deixa de existir (404)', async () => {
      await request(http).delete(`/api/eventos/${alertaId}`).set(auth(tokenA)).expect(200);
      await request(http).get(`/api/eventos/${alertaId}`).set(auth(tokenA)).expect(404);
    });

    it('rotas de compromissos exigem autenticação (401)', async () => {
      await request(http).get('/api/eventos').expect(401);
    });
  });

  describe('Proteção contra força bruta', () => {
    it('bloqueia o login após 5 tentativas por minuto (429)', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await request(http).post('/api/auth/login').send({ email: emailB, password: 'tentativa-errada' });
        statuses.push(res.status);
      }
      expect(statuses).toContain(429);
    });
  });
});
