import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Appointment } from './appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';
import {
  AppointmentCategory,
  CATEGORY_CODING,
  todayInAppTimezone,
} from './appointment-categories';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
  ) {}

  /**
   * RF03: Calcula alert_trigger_date = appointment_date - alert_lead_days
   * Garante a precisão do disparo do alerta preditivo de renovações e vistorias.
   */
  private calculateAlertTriggerDate(
    appointmentDateStr: string,
    leadDays: number,
  ): string {
    const [year, month, day] = appointmentDateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - leadDays);
    return date.toISOString().split('T')[0];
  }

  /**
   * Prioridade de exibição (baixo ruído cognitivo: o mais urgente sempre no topo):
   * 0 = alerta preditivo ativo (data de alerta atingida e não concluído)
   * 1 = pendente
   * 2 = concluído
   */
  private priorityOf(appointment: Appointment, today: string): number {
    if (appointment.isCompleted) return 2;
    return appointment.alertTriggerDate <= today ? 0 : 1;
  }

  private sortByPriority(appointments: Appointment[]): Appointment[] {
    const today = todayInAppTimezone();
    return [...appointments].sort((a, b) => {
      const byPriority = this.priorityOf(a, today) - this.priorityOf(b, today);
      if (byPriority !== 0) return byPriority;
      const byDate = a.appointmentDate.localeCompare(b.appointmentDate);
      if (byDate !== 0) return byDate;
      return (a.appointmentTime ?? '99:99').localeCompare(b.appointmentTime ?? '99:99');
    });
  }

  /**
   * RF02: Dupla codificação — usa o ícone/rótulo enviados ou, se ausentes,
   * os padronizados da categoria.
   */
  private resolveCoding(
    category: string,
    icon?: string,
    label?: string,
  ): { icon: string; label: string } {
    const defaults = CATEGORY_CODING[category as AppointmentCategory];
    return {
      icon: icon?.trim() || defaults.icon,
      label: label?.trim() || defaults.label,
    };
  }

  /**
   * RF03: Painel de alertas preditivos — compromissos pendentes cuja data de
   * alerta já foi atingida, do vencimento mais próximo para o mais distante.
   */
  async findAlerts(userId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: {
        userId,
        isCompleted: false,
        alertTriggerDate: LessThanOrEqual(todayInAppTimezone()),
      },
      order: { appointmentDate: 'ASC', appointmentTime: 'ASC' },
    });
  }

  /**
   * RNF02 (OWASP A01: Broken Access Control):
   * Lista apenas os compromissos pertencentes ao usuário autenticado (user_id),
   * com filtros opcionais e ordenação por prioridade.
   */
  async findAll(userId: string, query?: QueryAppointmentDto): Promise<Appointment[]> {
    const where: any = { userId };

    if (query?.category) {
      where.category = query.category;
    }

    if (query?.isCompleted !== undefined) {
      where.isCompleted = query.isCompleted === 'true';
    }

    if (query?.startDate && query?.endDate) {
      where.appointmentDate = Between(query.startDate, query.endDate);
    } else if (query?.startDate) {
      where.appointmentDate = MoreThanOrEqual(query.startDate);
    } else if (query?.endDate) {
      where.appointmentDate = LessThanOrEqual(query.endDate);
    }

    const appointments = await this.appointmentsRepository.find({ where });
    return this.sortByPriority(appointments);
  }

  /**
   * RNF02 (OWASP A01): Validação estrita de posse do recurso.
   * Se o compromisso pertencer a outro usuário, retorna 403 Forbidden.
   */
  async findOne(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Compromisso #${id} não encontrado.`);
    }

    if (appointment.userId !== userId) {
      throw new ForbiddenException(
        'Acesso negado. Você não tem permissão para acessar este compromisso (OWASP A01).',
      );
    }

    return appointment;
  }

  /**
   * RF01, RF02, RF03: Criação de agendamento com cálculo preditivo
   */
  async create(userId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    const alertLeadDays = dto.alertLeadDays ?? 30;
    const alertTriggerDate = this.calculateAlertTriggerDate(
      dto.appointmentDate,
      alertLeadDays,
    );

    const coding = this.resolveCoding(
      dto.category,
      dto.accessibleIcon,
      dto.accessibleLabel,
    );

    const appointment = this.appointmentsRepository.create({
      userId,
      title: dto.title.trim(),
      clientName: dto.clientName.trim(),
      category: dto.category,
      accessibleIcon: coding.icon,
      accessibleLabel: coding.label,
      appointmentDate: dto.appointmentDate,
      appointmentTime: dto.appointmentTime || undefined,
      alertLeadDays,
      alertTriggerDate,
      isCompleted: false,
      notes: dto.notes?.trim() || undefined,
    });

    return this.appointmentsRepository.save(appointment);
  }

  /**
   * Atualização de agendamento com recálculo automático de alerta caso a data mude.
   * A conclusão NÃO é feita aqui: só por PATCH /concluir, que aplica a verificação de data.
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);

    if (dto.title != null) appointment.title = dto.title.trim();
    if (dto.clientName != null) appointment.clientName = dto.clientName.trim();
    if (dto.category != null && dto.category !== appointment.category) {
      // Categoria mudou: ícone/rótulo acompanham, salvo se enviados explicitamente
      appointment.category = dto.category;
      const coding = this.resolveCoding(dto.category, dto.accessibleIcon, dto.accessibleLabel);
      appointment.accessibleIcon = coding.icon;
      appointment.accessibleLabel = coding.label;
    } else {
      if (dto.accessibleIcon?.trim()) appointment.accessibleIcon = dto.accessibleIcon.trim();
      if (dto.accessibleLabel?.trim()) appointment.accessibleLabel = dto.accessibleLabel.trim();
    }
    if (dto.appointmentTime !== undefined) appointment.appointmentTime = dto.appointmentTime || null; // null limpa o horário
    if (dto.notes !== undefined) appointment.notes = dto.notes?.trim() || null;

    // Recalcula alerta se data ou lead days forem alterados
    const newDate = dto.appointmentDate || appointment.appointmentDate;
    const newLeadDays = dto.alertLeadDays ?? appointment.alertLeadDays;

    if (dto.appointmentDate != null || dto.alertLeadDays != null) {
      appointment.appointmentDate = newDate;
      appointment.alertLeadDays = newLeadDays;
      appointment.alertTriggerDate = this.calculateAlertTriggerDate(newDate, newLeadDays);
    }

    return this.appointmentsRepository.save(appointment);
  }

  /**
   * Marcação de conclusão do compromisso.
   * Verificação de data: concluir em um dia diferente do agendado (antes ou depois)
   * exige confirmação explícita (confirmarForaDaData = true), evitando conclusões por engano.
   */
  async concluir(
    id: string,
    userId: string,
    confirmarForaDaData = false,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);
    if (appointment.isCompleted) return appointment;

    const today = todayInAppTimezone();
    const scheduled = String(appointment.appointmentDate).slice(0, 10);
    if (scheduled !== today && !confirmarForaDaData) {
      const [y, m, d] = scheduled.split('-');
      const when = scheduled > today ? 'ainda não chegou' : 'já passou';
      throw new UnprocessableEntityException(
        `Este compromisso está agendado para ${d}/${m}/${y} (a data ${when}). ` +
          'Para concluir fora da data agendada, confirme a ação.',
      );
    }

    appointment.isCompleted = true;
    return this.appointmentsRepository.save(appointment);
  }

  /**
   * Remoção do compromisso com verificação de autorização
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const appointment = await this.findOne(id, userId);
    await this.appointmentsRepository.remove(appointment);
    return { message: 'Compromisso removido com sucesso da agenda.' };
  }
}
