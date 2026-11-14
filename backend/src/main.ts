import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // OWASP A05:2021 - Cabeçalhos HTTP de segurança via Helmet
  app.use(helmet());

  // Prefixo global para a API RESTful: /api/...
  app.setGlobalPrefix('api');

  // OWASP A03:2021 - Validação e sanitização estrita de dados de entrada
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não declaradas nos DTOs
      forbidNonWhitelisted: true, // Rejeita payloads com campos maliciosos ou inesperados
      transform: true, // Converte tipos primitivos automaticamente
    }),
  );

  // OWASP A05:2021 - Filtro global de exceções para não expor stack traces ou dados sensíveis
  app.useGlobalFilters(new AllExceptionsFilter());

  // Configuração de CORS para permitir acesso do PWA Angular
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://seguros_frontend',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[Seguros API] Backend rodando em: http://localhost:${port}/api`);
}

bootstrap();
