import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ name: 'client_name', type: 'varchar', length: 150 })
  clientName: string;

  @Column({ type: 'varchar', length: 50 })
  category: string; // 'Renewal', 'Inspection', 'Claim', 'Meeting'

  @Column({ name: 'accessible_icon', type: 'varchar', length: 50 })
  accessibleIcon: string; // PrimeIcons: 'pi-refresh', 'pi-search', 'pi-exclamation-triangle', 'pi-users'

  @Column({ name: 'accessible_label', type: 'varchar', length: 50 })
  accessibleLabel: string; // 'Renovação', 'Vistoria', 'Sinistro', 'Reunião'

  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: string; // YYYY-MM-DD

  @Column({ name: 'appointment_time', type: 'time', nullable: true })
  appointmentTime?: string;

  @Column({ name: 'alert_lead_days', type: 'int', default: 30 })
  alertLeadDays: number;

  @Column({ name: 'alert_trigger_date', type: 'date' })
  alertTriggerDate: string; // YYYY-MM-DD (appointment_date - alert_lead_days)

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
