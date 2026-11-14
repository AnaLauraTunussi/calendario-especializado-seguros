import { UnauthorizedException } from '@nestjs/common';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('JwtStrategy', () => {
  it('devolve apenas a identificação mínima do usuário do token', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(
        Object.assign(new User(), { id: 'u1', email: 'ana@exemplo.com', fullName: 'Ana', passwordHash: 'hash' }),
      ),
    };
    const strategy = new JwtStrategy(users as unknown as UsersService);
    await expect(strategy.validate({ sub: 'u1', email: 'ana@exemplo.com' })).resolves.toEqual({
      id: 'u1',
      email: 'ana@exemplo.com',
      fullName: 'Ana',
    });
  });

  it('recusa (401) token de usuário que não existe mais', async () => {
    const users = { findById: jest.fn().mockResolvedValue(null) };
    const strategy = new JwtStrategy(users as unknown as UsersService);
    await expect(strategy.validate({ sub: 'removido', email: 'x@y.com' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();

  it('libera a requisição quando há usuário autenticado', () => {
    const user = { id: 'u1' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('responde 401 com mensagem clara quando não há token válido', () => {
    expect(() => guard.handleRequest(null, false)).toThrow(UnauthorizedException);
    expect(() => guard.handleRequest(null, false)).toThrow(/Token JWT ausente, expirado ou inválido/);
  });

  it('repassa o erro original da autenticação', () => {
    const original = new Error('falha na estratégia');
    expect(() => guard.handleRequest(original, false)).toThrow(original);
  });
});
