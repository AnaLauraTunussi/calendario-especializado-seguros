import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'create' | 'findByEmail'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'sign'>>;

  const user = Object.assign(new User(), {
    id: 'u1',
    fullName: 'Ana Teste',
    email: 'ana@exemplo.com',
    passwordHash: '',
  });

  beforeAll(async () => {
    user.passwordHash = await bcrypt.hash('senhaforte1', 4);
  });

  beforeEach(() => {
    users = { create: jest.fn(), findByEmail: jest.fn() };
    jwt = { sign: jest.fn().mockReturnValue('token-assinado') };
    service = new AuthService(users as unknown as UsersService, jwt as unknown as JwtService);
  });

  it('cadastra guardando apenas o hash bcrypt da senha e devolve o token', async () => {
    users.create.mockResolvedValue(user);
    const result = await service.register({ fullName: 'Ana Teste', email: 'ana@exemplo.com', password: 'senhaforte1' });

    const [, , passwordHash] = users.create.mock.calls[0];
    expect(passwordHash).not.toBe('senhaforte1');
    expect(passwordHash.startsWith('$2b$12$')).toBe(true); // bcrypt com custo 12
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'ana@exemplo.com' });
    expect(result).toEqual({
      message: 'Usuário cadastrado com sucesso.',
      accessToken: 'token-assinado',
      user: { id: 'u1', fullName: 'Ana Teste', email: 'ana@exemplo.com' },
    });
  });

  it('faz login com credenciais corretas sem expor o hash da senha', async () => {
    users.findByEmail.mockResolvedValue(user);
    const result = await service.login({ email: 'ana@exemplo.com', password: 'senhaforte1' });
    expect(result.accessToken).toBe('token-assinado');
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('recusa e-mail inexistente com mensagem genérica (sem revelar quais e-mails existem)', async () => {
    users.findByEmail.mockResolvedValue(null);
    const error = await service.login({ email: 'nao@existe.com', password: 'x' }).catch((e) => e);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.message).toBe('Credenciais inválidas.');
  });

  it('recusa senha errada com a mesma mensagem genérica', async () => {
    users.findByEmail.mockResolvedValue(user);
    const error = await service.login({ email: 'ana@exemplo.com', password: 'errada' }).catch((e) => e);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.message).toBe('Credenciais inválidas.');
  });
});
