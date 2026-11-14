import { Appointment, AppointmentStatus } from './models';

const pad = (n: number) => String(n).padStart(2, '0');

/** Data de hoje (AAAA-MM-DD) no fuso do aparelho. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toUTC(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isValidISODate(iso: string | null | undefined): iso is string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return toUTC(iso).toISOString().slice(0, 10) === iso;
}

export function addDays(iso: string, days: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUTC(toIso).getTime() - toUTC(fromIso).getTime()) / 86_400_000);
}

/** Ex.: "20/11/2026 (sexta-feira)" — data numérica + dia da semana por extenso. */
export function formatDate(iso: string): string {
  const d = toUTC(iso);
  const numeric = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  // "quarta-feira" não deve quebrar no hífen: o WORD JOINER (U+2060) impede a quebra
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(d).replace('-', '-\u2060');
  return `${numeric} (${weekday})`;
}

export function formatTime(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}

/** Texto explícito de prazo — nunca depende só de cor. */
export function dueText(iso: string, today = todayISO()): string {
  const days = daysBetween(today, iso);
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  if (days > 1) return `Vence em ${days} dias`;
  if (days === -1) return 'Venceu ontem';
  return `Venceu há ${-days} dias`;
}

export function statusOf(a: Appointment, today = todayISO()): AppointmentStatus {
  if (a.isCompleted) return 'concluido';
  return a.alertTriggerDate.slice(0, 10) <= today ? 'alerta' : 'pendente';
}
