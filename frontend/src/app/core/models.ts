import { IconName } from '../shared/icon.component';

export type Category = 'Renewal' | 'Inspection' | 'Claim' | 'Meeting' | 'Other';

export interface Appointment {
  id: string;
  userId: string;
  title: string;
  clientName: string;
  category: Category;
  accessibleIcon: string;
  accessibleLabel: string;
  appointmentDate: string; // AAAA-MM-DD
  appointmentTime: string | null; // HH:mm:ss
  alertLeadDays: number;
  alertTriggerDate: string; // AAAA-MM-DD
  isCompleted: boolean;
  notes: string | null;
}

/** Dados enviados ao criar/editar. Ícone e rótulo são atribuídos pelo backend. */
export interface AppointmentPayload {
  title: string;
  clientName: string;
  category: Category;
  appointmentDate: string;
  appointmentTime: string | null;
  alertLeadDays: number;
  notes: string;
  /** Só para "Outros": nome do tipo personalizado (ex.: "Cobrança"). */
  accessibleLabel?: string;
}

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: SessionUser;
}

export interface CategoryInfo {
  value: Category;
  label: string;
  icon: IconName;
}

/** RF02: dupla codificação — cada categoria tem ícone e rótulo textual fixos. */
export const CATEGORIES: readonly CategoryInfo[] = [
  { value: 'Renewal', label: 'Renovação', icon: 'pi-refresh' },
  { value: 'Inspection', label: 'Vistoria', icon: 'pi-search' },
  { value: 'Claim', label: 'Sinistro', icon: 'pi-exclamation-triangle' },
  { value: 'Meeting', label: 'Reunião', icon: 'pi-users' },
  { value: 'Other', label: 'Outros', icon: 'pi-tag' },
];

/** Tamanho máximo do nome de tipo personalizado ("Outros"). */
export const CUSTOM_LABEL_MAX = 40;

/**
 * Nome exibido da categoria. Para "Outros" com tipo personalizado: "Outros: Cobrança".
 */
export function displayLabel(category: Category, accessibleLabel?: string | null): string {
  const base = categoryInfo(category).label;
  const custom = accessibleLabel?.trim();
  if (category === 'Other' && custom && custom !== base) return `${base}: ${custom}`;
  return base;
}

/** Só o tipo personalizado (ou o nome da categoria), para espaços curtos como o calendário. */
export function shortDisplayLabel(category: Category, accessibleLabel?: string | null): string {
  const custom = accessibleLabel?.trim();
  if (category === 'Other' && custom && custom !== 'Outros') return custom;
  return categoryInfo(category).label;
}

export function categoryInfo(category: Category): CategoryInfo {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
}

export type AppointmentStatus = 'alerta' | 'pendente' | 'concluido';
