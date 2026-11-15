import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok';
  banco: 'ok';
  verificadoEm: string;
}

/**
 * Rota de saúde para o monitoramento pós-lançamento (GET /api/health).
 * Pública e sem dados sensíveis: confirma que a API está no ar e que o banco responde.
 * Responde 200 quando tudo está operante e 503 quando o banco está indisponível.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Serviço indisponível: o banco de dados não respondeu.');
    }
    return { status: 'ok', banco: 'ok', verificadoEm: new Date().toISOString() };
  }
}
