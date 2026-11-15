import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController (monitoramento)', () => {
  it('responde ok quando a API e o banco estão operantes', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new HealthController(dataSource as unknown as DataSource);

    const result = await controller.check();

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(result).toMatchObject({ status: 'ok', banco: 'ok' });
    expect(new Date(result.verificadoEm).toString()).not.toBe('Invalid Date');
  });

  it('responde 503 (serviço indisponível) quando o banco não responde', async () => {
    const dataSource = { query: jest.fn().mockRejectedValue(new Error('conexão recusada')) };
    const controller = new HealthController(dataSource as unknown as DataSource);

    const error = await controller.check().catch((e) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getStatus()).toBe(503);
    expect(error.message).not.toContain('conexão recusada'); // detalhe interno não é exposto
  });
});
