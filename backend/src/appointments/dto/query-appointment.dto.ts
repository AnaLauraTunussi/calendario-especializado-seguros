import { IsOptional, IsDateString, IsIn } from 'class-validator';
import { APPOINTMENT_CATEGORIES } from '../appointment-categories';

export class QueryAppointmentDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn([...APPOINTMENT_CATEGORIES], {
    message: 'A categoria deve ser Renewal, Inspection, Claim, Meeting ou Other.',
  })
  category?: string;

  @IsOptional()
  @IsIn(['true', 'false'], { message: 'isCompleted deve ser "true" ou "false".' })
  isCompleted?: string;
}
