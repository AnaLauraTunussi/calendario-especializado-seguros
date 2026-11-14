import { databaseConfig, jwtSecret, readEnv } from './env';

describe('config/env', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('usa o valor da variável de ambiente quando definida', () => {
    process.env.JWT_SECRET = '  segredo-real  ';
    expect(jwtSecret()).toBe('segredo-real');
  });

  it('usa o valor padrão fora de produção', () => {
    delete process.env.MINHA_VARIAVEL;
    process.env.NODE_ENV = 'development';
    expect(readEnv('MINHA_VARIAVEL', 'padrao')).toBe('padrao');
  });

  it('impede a inicialização em produção quando uma variável obrigatória falta', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => jwtSecret()).toThrow('Variável de ambiente obrigatória ausente: JWT_SECRET');
  });

  it('monta a configuração do banco a partir do ambiente', () => {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      DATABASE_HOST: 'db',
      DATABASE_PORT: '6543',
      DATABASE_USER: 'usuario',
      DATABASE_PASSWORD: 'senha',
      DATABASE_NAME: 'banco',
    });
    expect(databaseConfig()).toEqual({ host: 'db', port: 6543, username: 'usuario', password: 'senha', database: 'banco' });
  });
});
