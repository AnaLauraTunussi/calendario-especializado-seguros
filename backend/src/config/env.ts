/**
 * Leitura centralizada de variáveis de ambiente.
 *
 * Em produção (NODE_ENV=production) toda variável é obrigatória: a API não inicia
 * com segredos ou credenciais ausentes. Fora de produção, valores padrão permitem
 * rodar o projeto localmente sem configuração extra.
 */
export function readEnv(name: string, developmentDefault: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. Configure-a antes de iniciar a API.`,
    );
  }
  return developmentDefault;
}

export const databaseConfig = () => ({
  host: readEnv('DATABASE_HOST', 'localhost'),
  port: Number(readEnv('DATABASE_PORT', '5432')),
  username: readEnv('DATABASE_USER', 'corretor_admin'),
  password: readEnv('DATABASE_PASSWORD', 'seguro_tech_2024'),
  database: readEnv('DATABASE_NAME', 'calendario_seguros'),
});

/** Segredo de assinatura dos tokens JWT (único ponto de leitura). */
export const jwtSecret = () => readEnv('JWT_SECRET', 'segredo-apenas-para-desenvolvimento-local');

/** RNF01: validade do token de acesso. */
export const JWT_EXPIRES_IN = '8h';
