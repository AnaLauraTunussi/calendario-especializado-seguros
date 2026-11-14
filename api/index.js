// Função serverless da Vercel: a API NestJS (compilada em backend/dist no build) atende /api/*.
// O driver do PostgreSQL é carregado dinamicamente pelo TypeORM; o require explícito garante
// que ele seja incluído no pacote da função.
require('pg');
const { createServerlessHandler } = require('../backend/dist/serverless');

module.exports = createServerlessHandler();
