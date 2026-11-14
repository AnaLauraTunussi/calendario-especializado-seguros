import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';
import { ConcluirAppointmentDto } from './dto/concluir-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controller de Compromissos e Alertas Preditivos
 * Rota base: /eventos (com prefixo global /api configurado no main.ts)
 * Todos os endpoints são estritamente protegidos por JWT (RNF01) e verificam posse (RNF02).
 */
@UseGuards(JwtAuthGuard)
@Controller('eventos')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // GET /api/eventos — Lista compromissos do usuário com filtros opcionais
  @Get()
  async findAll(@Request() req: any, @Query() query: QueryAppointmentDto) {
    return this.appointmentsService.findAll(req.user.id, query);
  }

  // GET /api/eventos/alertas — Alertas preditivos ativos (pendentes com data de alerta atingida)
  // Declarado antes de ':id' para não ser capturado pela rota parametrizada.
  @Get('alertas')
  async findAlerts(@Request() req: any) {
    return this.appointmentsService.findAlerts(req.user.id);
  }

  // GET /api/eventos/:id — Detalha um compromisso específico
  @Get(':id')
  async findOne(
    @Request() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.appointmentsService.findOne(id, req.user.id);
  }

  // POST /api/eventos — Cadastra novo agendamento com cálculo preditivo
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(req.user.id, dto);
  }

  // PUT /api/eventos/:id — Atualiza dados do compromisso
  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, req.user.id, dto);
  }

  // PATCH /api/eventos/:id/concluir — Marcação rápida de tarefa concluída
  @Patch(':id/concluir')
  async concluir(
    @Request() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ConcluirAppointmentDto,
  ) {
    return this.appointmentsService.concluir(id, req.user.id, dto?.confirmarForaDaData === true);
  }

  // DELETE /api/eventos/:id — Exclui compromisso
  @Delete(':id')
  async remove(
    @Request() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.appointmentsService.remove(id, req.user.id);
  }
}
