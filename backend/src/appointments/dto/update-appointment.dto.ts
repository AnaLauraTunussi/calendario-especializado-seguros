import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  Max,
  Matches,
} from 'class-validator';
import { APPOINTMENT_CATEGORIES } from '../appointment-categories';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  clientName?: string;

  @IsOptional()
  @IsString()
  @IsIn([...APPOINTMENT_CATEGORIES])
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accessibleIcon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accessibleLabel?: string;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'O horário do compromisso deve estar no formato HH:mm.',
  })
  appointmentTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  alertLeadDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
