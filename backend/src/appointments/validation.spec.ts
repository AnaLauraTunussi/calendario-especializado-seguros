import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { APPOINTMENT_CATEGORIES, CATEGORY_CODING, todayInAppTimezone } from './appointment-categories';
import { ConcluirAppointmentDto } from './dto/concluir-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

/** Campos com erro de validação para um DTO e um payload. */
async function invalidFields<T extends object>(dto: new () => T, payload: object): Promise<string[]> {
  const errors = await validate(plainToInstance(dto, payload));
  return errors.map((e) => e.property).sort();
}

const valid = {
  title: 'Vistoria Auto',
  clientName: 'João',
  category: 'Inspection',
  appointmentDate: '2026-12-10',
};

describe('Categorias (dupla codificação)', () => {
  it('toda categoria tem ícone e rótulo textual', () => {
    for (const category of APPOINTMENT_CATEGORIES) {
      expect(CATEGORY_CODING[category].icon).toMatch(/^pi-/);
      expect(CATEGORY_CODING[category].label.length).toBeGreaterThan(0);
    }
    expect(CATEGORY_CODING.Other).toEqual({ icon: 'pi-tag', label: 'Outros' });
  });

  it('calcula "hoje" no fuso de São Paulo (e não em UTC)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-15T02:30:00Z')); // 23:30 do dia 14 em SP
    delete process.env.APP_TIMEZONE;
    expect(todayInAppTimezone()).toBe('2026-11-14');
    jest.useRealTimers();
  });
});

describe('CreateAppointmentDto', () => {
  it('aceita um compromisso válido, com horário em HH:mm ou HH:mm:ss', async () => {
    expect(await invalidFields(CreateAppointmentDto, valid)).toEqual([]);
    expect(await invalidFields(CreateAppointmentDto, { ...valid, appointmentTime: '14:30:00', alertLeadDays: 365 })).toEqual([]);
  });

  it('exige título, cliente, categoria e data', async () => {
    expect(await invalidFields(CreateAppointmentDto, {})).toEqual(['appointmentDate', 'category', 'clientName', 'title']);
  });

  it('recusa categoria, horário, antecedência e tamanhos inválidos', async () => {
    const fields = await invalidFields(CreateAppointmentDto, {
      ...valid,
      title: 'x'.repeat(151),
      category: 'Foo',
      appointmentTime: '25:00',
      alertLeadDays: 400,
      notes: 'x'.repeat(1001),
    });
    expect(fields).toEqual(['alertLeadDays', 'appointmentTime', 'category', 'notes', 'title']);
  });

  it('recusa antecedência menor que 1 dia e data inválida', async () => {
    expect(await invalidFields(CreateAppointmentDto, { ...valid, alertLeadDays: 0, appointmentDate: 'ontem' })).toEqual([
      'alertLeadDays',
      'appointmentDate',
    ]);
  });
});

describe('UpdateAppointmentDto', () => {
  it('aceita atualização parcial e recusa valores inválidos', async () => {
    expect(await invalidFields(UpdateAppointmentDto, { title: 'Novo' })).toEqual([]);
    expect(await invalidFields(UpdateAppointmentDto, { category: 'Foo', appointmentTime: '9h', alertLeadDays: 0 })).toEqual([
      'alertLeadDays',
      'appointmentTime',
      'category',
    ]);
  });
});

describe('QueryAppointmentDto e ConcluirAppointmentDto', () => {
  it('valida filtros de listagem', async () => {
    expect(await invalidFields(QueryAppointmentDto, { category: 'Other', isCompleted: 'true' })).toEqual([]);
    expect(await invalidFields(QueryAppointmentDto, { category: 'Foo', isCompleted: 'talvez', startDate: 'x' })).toEqual([
      'category',
      'isCompleted',
      'startDate',
    ]);
  });

  it('a confirmação de conclusão fora da data deve ser booleana', async () => {
    expect(await invalidFields(ConcluirAppointmentDto, { confirmarForaDaData: true })).toEqual([]);
    expect(await invalidFields(ConcluirAppointmentDto, { confirmarForaDaData: 'sim' })).toEqual(['confirmarForaDaData']);
  });
});
