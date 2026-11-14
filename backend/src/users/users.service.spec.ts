import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'create' | 'save'>>;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((data) => Object.assign(new User(), data)),
      save: jest.fn(async (u) => Object.assign(new User(), { id: 'u1', ...u })),
    } as any;
    service = new UsersService(repo as unknown as Repository<User>);
  });

  it('busca por e-mail normalizado (minúsculas, sem espaços)', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.findByEmail('  Ana@Exemplo.COM ');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'ana@exemplo.com' } });
  });

  it('busca por id e retorna null quando não encontra', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findById('x')).resolves.toBeNull();
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'x' } });
  });

  it('cria o usuário com nome e e-mail normalizados', async () => {
    repo.findOne.mockResolvedValue(null);
    const created = await service.create('  Ana Teste ', ' ANA@exemplo.com', 'hash');
    expect(created).toMatchObject({ id: 'u1', fullName: 'Ana Teste', email: 'ana@exemplo.com', passwordHash: 'hash' });
  });

  it('recusa e-mail já cadastrado com 409', async () => {
    repo.findOne.mockResolvedValue(Object.assign(new User(), { id: 'existente' }));
    await expect(service.create('Ana', 'ana@exemplo.com', 'hash')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
