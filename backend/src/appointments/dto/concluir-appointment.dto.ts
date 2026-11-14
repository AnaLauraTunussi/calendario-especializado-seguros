import { IsBoolean, IsOptional } from 'class-validator';

/** Corpo opcional de PATCH /eventos/:id/concluir. */
export class ConcluirAppointmentDto {
  /** Obrigatório (true) para concluir em um dia diferente do agendado. */
  @IsOptional()
  @IsBoolean({ message: 'confirmarForaDaData deve ser verdadeiro ou falso.' })
  confirmarForaDaData?: boolean;
}
