import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  Max,
  Matches,
} from 'class-validator';
import { APPOINTMENT_CATEGORIES } from '../appointment-categories';

export class CreateAppointmentDto {
  @IsString({ message: 'O título deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O título do compromisso é obrigatório (RF01).' })
  @MaxLength(150, { message: 'O título deve ter no máximo 150 caracteres.' })
  title: string;

  @IsString({ message: 'O nome do cliente deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório (LGPD minimização).' })
  @MaxLength(150, { message: 'O nome do cliente deve ter no máximo 150 caracteres.' })
  clientName: string;

  @IsString({ message: 'A categoria deve ser um texto válido.' })
  @IsNotEmpty({ message: 'A categoria é obrigatória.' })
  @IsIn([...APPOINTMENT_CATEGORIES], {
    message: 'A categoria deve ser Renewal, Inspection, Claim, Meeting ou Other.',
  })
  category: string;

  // RF02: opcional — quando omitido, é atribuído automaticamente pela categoria
  @IsOptional()
  @IsString({ message: 'O ícone acessível deve ser uma string (RF02).' })
  @MaxLength(50)
  accessibleIcon?: string;

  // RF02: opcional — quando omitido, é atribuído automaticamente pela categoria
  @IsOptional()
  @IsString({ message: 'O rótulo textual acessível deve ser uma string (RF02).' })
  @MaxLength(50)
  accessibleLabel?: string;

  @IsDateString({}, { message: 'A data do compromisso deve ser uma data válida (AAAA-MM-DD).' })
  @IsNotEmpty({ message: 'A data do compromisso é obrigatória.' })
  appointmentDate: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'O horário do compromisso deve estar no formato HH:mm.',
  })
  appointmentTime?: string;

  @IsOptional()
  @IsInt({ message: 'O prazo de antecedência deve ser um número inteiro de dias.' })
  @Min(1, { message: 'A antecedência mínima é de 1 dia.' })
  @Max(365, { message: 'A antecedência máxima é de 365 dias.' })
  alertLeadDays?: number;

  @IsOptional()
  @IsString({ message: 'As observações devem ser em formato texto.' })
  @MaxLength(1000, { message: 'As observações devem ter no máximo 1000 caracteres.' })
  notes?: string;
}
