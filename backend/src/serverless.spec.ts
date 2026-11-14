import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createServerlessHandler } from './serverless';

/** Aplicação NestJS simulada: registra o que a configuração global aplica. */
function fakeApp() {
  const app = {
    getHttpAdapter: () => ({ getInstance: () => ({ set: jest.fn() }) }),
    use: jest.fn(),
    setGlobalPrefix: jest.fn(),
    useGlobalPipes: jest.fn(),
    useGlobalFilters: jest.fn(),
    enableCors: jest.fn(),
    init: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
  return app as unknown as INestApplication & typeof app;
}

describe('createServerlessHandler', () => {
  it('cria a aplicação uma única vez, com a configuração de produção, e a reaproveita', async () => {
    const app = fakeApp();
    const createApp = jest.fn().mockResolvedValue(app);
    const handler = createServerlessHandler(createApp);

    // a aplicação simulada não tem rotas: o Express responde 404, mas a requisição é atendida
    await request(handler).get('/api/eventos').expect(404);
    await request(handler).get('/api/eventos').expect(404);

    expect(createApp).toHaveBeenCalledTimes(1); // "warm start": sem recriar a API
    expect(app.init).toHaveBeenCalledTimes(1);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(app.useGlobalPipes).toHaveBeenCalled();
    expect(app.useGlobalFilters).toHaveBeenCalled();
    expect(app.enableCors).toHaveBeenCalled();
  });

  it('close() encerra a aplicação criada e não faz nada se ela ainda não existe', async () => {
    const app = fakeApp();
    const handler = createServerlessHandler(jest.fn().mockResolvedValue(app));

    await handler.close(); // ainda não criada
    expect(app.close).not.toHaveBeenCalled();

    await request(handler).get('/').expect(404);
    await handler.close();
    expect(app.close).toHaveBeenCalledTimes(1);
  });
});
