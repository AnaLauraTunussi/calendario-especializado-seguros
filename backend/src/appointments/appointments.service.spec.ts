import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentsService } from './appointments.service';

/** "Hoje" fixo nos testes: 14/11/2026, meio-dia em São Paulo. */
const NOW = new Date('2026-11-14T15:00:00Z');

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return Object.assign(new Appointment(), {
    id: 'a1',
    userId: 'u1',
    title: 'Renovação',
    clientName: 'Carlos',
    category: 'Renewal',
    accessibleIcon: 'pi-refresh',
    accessibleLabel: 'Renovação',
    appointmentDate: '2026-11-20',
    appointmentTime: null,
    alertLeadDays: 30,
    alertTriggerDate: '2026-10-21',
    isCompleted: false,
    notes: null,
    ...overrides,
  });
}

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let repo: jest.Mocked<Pick<Repository<Appointment>, 'create' | 'save' | 'find' | 'findOne' | 'remove'>>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    repo = {
      create: jest.fn((data) => Object.assign(new Appointment(), data)),
      save: jest.fn(async (a) => a as Appointment),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    } as any;
    service = new AppointmentsService(repo as unknown as Repository<Appointment>);
  });

  afterEach(() => jest.useRealTimers());

  describe('create', () => {
    it('calcula a data de alerta (data − antecedência) e atribui ícone e rótulo pela categoria', async () => {
      const result = await service.create('u1', {
        title: '  Vistoria Auto  ',
        clientName: ' João ',
        category: 'Inspection',
        appointmentDate: '2026-12-10',
        alertLeadDays: 30,
      });

      expect(result).toMatchObject({
        userId: 'u1',
        title: 'Vistoria Auto',
        clientName: 'João',
        accessibleIcon: 'pi-search',
        accessibleLabel: 'Vistoria',
        alertTriggerDate: '2026-11-10',
        isCompleted: false,
      });
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('usa 30 dias de antecedência por padrão e atravessa a virada de ano', async () => {
      const result = await service.create('u1', {
        title: 'Renovação',
        clientName: 'Ana',
        category: 'Renewal',
        appointmentDate: '2027-01-15',
      });
      expect(result.alertLeadDays).toBe(30);
      expect(result.alertTriggerDate).toBe('2026-12-16');
    });

    it('aceita tipo personalizado na categoria "Outros"', async () => {
      const result = await service.create('u1', {
        title: 'Cobrança',
        clientName: 'Ana',
        category: 'Other',
        accessibleLabel: ' Cobrança ',
        appointmentDate: '2026-12-01',
      });
      expect(result.accessibleIcon).toBe('pi-tag');
      expect(result.accessibleLabel).toBe('Cobrança');
    });

    it('guarda horário e observações quando informados', async () => {
      const result = await service.create('u1', {
        title: 'Reunião',
        clientName: 'Ana',
        category: 'Meeting',
        appointmentDate: '2026-12-01',
        appointmentTime: '14:30',
        notes: '  levar proposta ',
      });
      expect(result.appointmentTime).toBe('14:30');
      expect(result.notes).toBe('levar proposta');
    });
  });

  describe('findAll', () => {
    it('ordena por prioridade: alertas ativos, pendentes e concluídos (depois por data e horário)', async () => {
      repo.find.mockResolvedValue([
        makeAppointment({ id: 'concluido', isCompleted: true, appointmentDate: '2026-11-01', alertTriggerDate: '2026-10-01' }),
        makeAppointment({ id: 'pendente', appointmentDate: '2027-03-01', alertTriggerDate: '2027-02-01' }),
        makeAppointment({ id: 'alerta-tarde', appointmentDate: '2026-11-20', appointmentTime: '15:00', alertTriggerDate: '2026-10-21' }),
        makeAppointment({ id: 'alerta-cedo', appointmentDate: '2026-11-20', appointmentTime: '09:00', alertTriggerDate: '2026-10-21' }),
        makeAppointment({ id: 'alerta-sem-hora', appointmentDate: '2026-11-20', appointmentTime: null, alertTriggerDate: '2026-10-21' }),
        makeAppointment({ id: 'alerta-antes', appointmentDate: '2026-11-15', alertTriggerDate: '2026-10-16' }),
      ]);

      const ids = (await service.findAll('u1')).map((a) => a.id);
      expect(ids).toEqual(['alerta-antes', 'alerta-cedo', 'alerta-tarde', 'alerta-sem-hora', 'pendente', 'concluido']);
      expect(repo.find).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('no mesmo dia, compromisso sem horário fica depois dos que têm horário (em qualquer ordem de entrada)', async () => {
      const semHora = makeAppointment({ id: 'sem-hora', appointmentDate: '2027-03-01', alertTriggerDate: '2027-02-01', appointmentTime: null });
      const comHora = makeAppointment({ id: 'com-hora', appointmentDate: '2027-03-01', alertTriggerDate: '2027-02-01', appointmentTime: '08:00' });

      repo.find.mockResolvedValue([semHora, comHora]);
      expect((await service.findAll('u1')).map((a) => a.id)).toEqual(['com-hora', 'sem-hora']);

      repo.find.mockResolvedValue([comHora, semHora]);
      expect((await service.findAll('u1')).map((a) => a.id)).toEqual(['com-hora', 'sem-hora']);
    });

    it('aplica filtros de categoria, situação e intervalo de datas', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll('u1', { category: 'Claim', isCompleted: 'true', startDate: '2026-11-01', endDate: '2026-11-30' });
      const where = repo.find.mock.calls[0][0].where as Record<string, any>;
      expect(where).toMatchObject({ userId: 'u1', category: 'Claim', isCompleted: true });
      expect(where.appointmentDate.type).toBe('between');
      expect(where.appointmentDate.value).toEqual(['2026-11-01', '2026-11-30']);
    });

    it('aceita só data inicial ou só data final', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll('u1', { startDate: '2026-11-01', isCompleted: 'false' });
      await service.findAll('u1', { endDate: '2026-11-30' });
      const [first, second] = repo.find.mock.calls.map((c) => c[0].where as Record<string, any>);
      expect(first.appointmentDate.type).toBe('moreThanOrEqual');
      expect(first.isCompleted).toBe(false);
      expect(second.appointmentDate.type).toBe('lessThanOrEqual');
    });
  });

  describe('findAlerts', () => {
    it('busca pendentes do usuário cuja data de alerta já chegou (até hoje)', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAlerts('u1');
      const options = repo.find.mock.calls[0][0] as any;
      expect(options.where).toMatchObject({ userId: 'u1', isCompleted: false });
      expect(options.where.alertTriggerDate.type).toBe('lessThanOrEqual');
      expect(options.where.alertTriggerDate.value).toBe('2026-11-14');
      expect(options.order).toEqual({ appointmentDate: 'ASC', appointmentTime: 'ASC' });
    });
  });

  describe('findOne', () => {
    it('retorna o compromisso do próprio usuário', async () => {
      repo.findOne.mockResolvedValue(makeAppointment());
      await expect(service.findOne('a1', 'u1')).resolves.toMatchObject({ id: 'a1' });
    });

    it('lança 404 quando o compromisso não existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lança 403 quando o compromisso pertence a outro usuário', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ userId: 'outro' }));
      await expect(service.findOne('a1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('update', () => {
    it('ao trocar a categoria, atualiza ícone e rótulo padrão', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ category: 'Other', accessibleIcon: 'pi-tag', accessibleLabel: 'Cobrança' }));
      const result = await service.update('a1', 'u1', { category: 'Renewal' });
      expect(result).toMatchObject({ category: 'Renewal', accessibleIcon: 'pi-refresh', accessibleLabel: 'Renovação' });
    });

    it('mantendo a categoria, aceita novo rótulo personalizado e ignora rótulo vazio', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ category: 'Other', accessibleIcon: 'pi-tag', accessibleLabel: 'Outros' }));
      const result = await service.update('a1', 'u1', { category: 'Other', accessibleLabel: ' Cobrança ', accessibleIcon: '  ' });
      expect(result.accessibleLabel).toBe('Cobrança');
      expect(result.accessibleIcon).toBe('pi-tag');
    });

    it('aceita ícone personalizado sem trocar a categoria', async () => {
      repo.findOne.mockResolvedValue(makeAppointment());
      const result = await service.update('a1', 'u1', { accessibleIcon: ' pi-star ' });
      expect(result.accessibleIcon).toBe('pi-star');
    });

    it('recalcula a data de alerta quando a data ou a antecedência mudam', async () => {
      repo.findOne.mockResolvedValue(makeAppointment());
      const byDate = await service.update('a1', 'u1', { appointmentDate: '2027-02-01' });
      expect(byDate.alertTriggerDate).toBe('2027-01-02');

      repo.findOne.mockResolvedValue(makeAppointment());
      const byLead = await service.update('a1', 'u1', { alertLeadDays: 10 });
      expect(byLead).toMatchObject({ appointmentDate: '2026-11-20', alertLeadDays: 10, alertTriggerDate: '2026-11-10' });
    });

    it('atualiza textos com trim, limpa horário e observações quando enviados vazios', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ appointmentTime: '10:00', notes: 'antiga' }));
      const result = await service.update('a1', 'u1', {
        title: ' Novo título ',
        clientName: ' Nova Cliente ',
        appointmentTime: null,
        notes: '   ',
      });
      expect(result).toMatchObject({ title: 'Novo título', clientName: 'Nova Cliente', appointmentTime: null, notes: null });
      expect(result.alertTriggerDate).toBe('2026-10-21'); // data não mudou: alerta mantido
    });

    it('não permite concluir pela edição: isCompleted não é alterado', async () => {
      repo.findOne.mockResolvedValue(makeAppointment());
      const result = await service.update('a1', 'u1', { isCompleted: true } as any);
      expect(result.isCompleted).toBe(false);
    });
  });

  describe('concluir (verificação de data)', () => {
    it('conclui direto quando a data agendada é hoje', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ appointmentDate: '2026-11-14' }));
      await expect(service.concluir('a1', 'u1')).resolves.toMatchObject({ isCompleted: true });
    });

    it('recusa (422) concluir antes da data sem confirmação, explicando a data', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ appointmentDate: '2026-11-20' }));
      const error = await service.concluir('a1', 'u1').catch((e) => e);
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.message).toContain('20/11/2026');
      expect(error.message).toContain('ainda não chegou');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('recusa (422) concluir depois da data sem confirmação', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ appointmentDate: '2026-11-10' }));
      const error = await service.concluir('a1', 'u1').catch((e) => e);
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.message).toContain('já passou');
    });

    it('conclui fora da data quando a confirmação é enviada', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ appointmentDate: '2026-11-20' }));
      await expect(service.concluir('a1', 'u1', true)).resolves.toMatchObject({ isCompleted: true });
    });

    it('não altera um compromisso que já estava concluído', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ isCompleted: true }));
      await service.concluir('a1', 'u1');
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('exclui o compromisso do próprio usuário', async () => {
      const appointment = makeAppointment();
      repo.findOne.mockResolvedValue(appointment);
      await expect(service.remove('a1', 'u1')).resolves.toEqual({ message: 'Compromisso removido com sucesso da agenda.' });
      expect(repo.remove).toHaveBeenCalledWith(appointment);
    });
  });
});
