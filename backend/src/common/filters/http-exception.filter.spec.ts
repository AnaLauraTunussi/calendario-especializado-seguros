import { ArgumentsHost, BadRequestException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

function mockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/api/eventos' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  beforeEach(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('mantém o status e a mensagem de erros HTTP conhecidos', () => {
    const { host, status, json } = mockHost();
    filter.catch(new NotFoundException('Compromisso não encontrado.'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, path: '/api/eventos', message: 'Compromisso não encontrado.' }),
    );
  });

  it('devolve a lista de mensagens de validação', () => {
    const { host, json } = mockHost();
    filter.catch(new BadRequestException(['título obrigatório', 'data inválida']), host);
    expect(json.mock.calls[0][0].message).toEqual(['título obrigatório', 'data inválida']);
  });

  it('aceita HttpException com resposta em texto', () => {
    const { host, json } = mockHost();
    const { HttpException } = jest.requireActual('@nestjs/common');
    filter.catch(new HttpException('Muitas requisições', HttpStatus.TOO_MANY_REQUESTS), host);
    expect(json.mock.calls[0][0]).toMatchObject({ statusCode: 429, message: 'Muitas requisições' });
  });

  it('erros inesperados viram 500 genérico, sem stack trace, e são registrados no log interno', () => {
    const { host, status, json } = mockHost();
    filter.catch(new Error('senha do banco: segredo'), host);
    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Erro interno no servidor.');
    expect(JSON.stringify(body)).not.toContain('segredo');
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('registra também erros que não são instâncias de Error', () => {
    const { host, status } = mockHost();
    filter.catch('falha desconhecida', host);
    expect(status).toHaveBeenCalledWith(500);
  });
});
