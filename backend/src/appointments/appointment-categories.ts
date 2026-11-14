/**
 * RF02: Dupla codificação visual obrigatória.
 * Cada categoria possui um ícone padronizado e um rótulo textual fixo,
 * eliminando a dependência exclusiva de cores (daltonismo / neuroinclusão).
 */
export const APPOINTMENT_CATEGORIES = [
  'Renewal',
  'Inspection',
  'Claim',
  'Meeting',
  'Other',
] as const;

export type AppointmentCategory = (typeof APPOINTMENT_CATEGORIES)[number];

export const CATEGORY_CODING: Record<
  AppointmentCategory,
  { icon: string; label: string }
> = {
  Renewal: { icon: 'pi-refresh', label: 'Renovação' },
  Inspection: { icon: 'pi-search', label: 'Vistoria' },
  Claim: { icon: 'pi-exclamation-triangle', label: 'Sinistro' },
  Meeting: { icon: 'pi-users', label: 'Reunião' },
  // "Outros": o rótulo pode ser personalizado pelo corretor (ex.: "Cobrança")
  Other: { icon: 'pi-tag', label: 'Outros' },
};

/**
 * Data de hoje (AAAA-MM-DD) no fuso da corretora, usada para decidir
 * se um alerta preditivo já foi disparado.
 */
export function todayInAppTimezone(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
