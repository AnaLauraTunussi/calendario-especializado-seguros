import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express = require('express');
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

export interface ServerlessHandler {
  (req: express.Request, res: express.Response): Promise<void>;
  /** Encerra a aplicação (conexões com o banco), se já tiver sido criada. */
  close(): Promise<void>;
}

/**
 * Entrada da API para ambientes serverless (função da Vercel em /api).
 *
 * A aplicação NestJS é criada uma única vez por instância e reaproveitada nas
 * requisições seguintes ("warm start"), com a mesma configuração de produção
 * (configureApp) usada pelo main.ts e pelos testes de integração.
 */
export function createServerlessHandler(
  createApp: (server: express.Express) => Promise<INestApplication> = (server) =>
    NestFactory.create(AppModule, new ExpressAdapter(server), { logger: ['error', 'warn'] }),
): ServerlessHandler {
  let ready: Promise<{ server: express.Express; app: INestApplication }> | null = null;

  async function bootstrap() {
    const server = express();
    const app = configureApp(await createApp(server));
    await app.init();
    return { server, app };
  }

  const handler = (async (req, res) => {
    ready ??= bootstrap();
    const { server } = await ready;
    server(req, res);
  }) as ServerlessHandler;

  handler.close = async () => {
    if (!ready) return;
    const { app } = await ready;
    await app.close();
    ready = null;
  };

  return handler;
}
