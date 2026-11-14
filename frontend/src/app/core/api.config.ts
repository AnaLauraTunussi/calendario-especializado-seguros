/**
 * Endereço da API NestJS, sempre no mesmo domínio do site (sem CORS):
 * - Vercel: função serverless em /api;
 * - Docker: o Nginx repassa /api para o backend;
 * - ng serve: o proxy (proxy.conf.json) repassa /api para localhost:3000.
 */
export const API_URL = '/api';
