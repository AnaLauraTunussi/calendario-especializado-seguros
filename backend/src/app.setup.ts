import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

/** Origens autorizadas a chamar a API (PWA Angular). */
export const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://seguros_frontend',
];

/**
 * Configuração global da API, compartilhada pela inicialização (main.ts)
 * e pelos testes de integração — garante que os testes exercitam exatamente
 * a mesma pilha de segurança e validação da produção.
 */
export function configureApp(app: INestApplication): INestApplication {
  // OWASP A05:2021 - Cabeçalhos HTTP de segurança via Helmet
  app.use(helmet());

  // Prefixo global para a API RESTful: /api/...
  app.setGlobalPrefix('api');

  // OWASP A03:2021 - Validação e sanitização estrita de dados de entrada
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não declaradas nos DTOs
      forbidNonWhitelisted: true, // Rejeita payloads com campos inesperados
      transform: true, // Converte tipos primitivos automaticamente
    }),
  );

  // OWASP A05:2021 - Filtro global de exceções: não expõe stack traces nem dados sensíveis
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS restrito ao PWA
  app.enableCors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  return app;
}
