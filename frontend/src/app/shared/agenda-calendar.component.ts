import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventContentArg, EventInput } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { statusOf } from '../core/date-utils';
import { Appointment, Category, displayLabel, shortDisplayLabel } from '../core/models';

/** Abreviações para telas estreitas (o nome completo fica no aria-label). */
const SHORT_LABELS: Record<Category, string> = {
  Renewal: 'Ren.',
  Inspection: 'Vis.',
  Claim: 'Sin.',
  Meeting: 'Reu.',
  Other: 'Out.',
};

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Calendário mensal (FullCalendar) com dupla codificação:
 * cada evento tem a COR da categoria + o RÓTULO textual ("Vistoria: …"),
 * alertas recebem "⚠" + borda tracejada e concluídos "✓" + texto riscado.
 * Clicar no dia (ou ativar o número do dia pelo teclado) emite dayChosen.
 */
@Component({
  selector: 'app-agenda-calendar',
  standalone: true,
  imports: [FullCalendarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<full-calendar [options]="options()" />`,
})
export class AgendaCalendarComponent {
  readonly appointments = input.required<Appointment[]>();
  readonly today = input.required<string>();
  readonly selectedDay = input<string | null>(null);
  readonly dayChosen = output<string>();
  readonly eventChosen = output<string>();

  private readonly events = computed<EventInput[]>(() =>
    this.appointments().map((a) => {
      const status = statusOf(a, this.today());
      return {
        id: a.id,
        title: a.title,
        start: a.appointmentTime ? `${a.appointmentDate}T${a.appointmentTime}` : a.appointmentDate,
        allDay: !a.appointmentTime,
        // Cores aplicadas por classe CSS (ev--Categoria), para seguir o tema claro/escuro
        classNames: ['ev', `ev--${a.category}`, `ev--${status}`],
        extendedProps: {
          label: shortDisplayLabel(a.category, a.accessibleLabel),
          fullLabel: displayLabel(a.category, a.accessibleLabel),
          short: SHORT_LABELS[a.category],
          status,
          client: a.clientName,
        },
      };
    }),
  );

  protected readonly options = computed<CalendarOptions>(() => {
    const selected = this.selectedDay();
    return {
      plugins: [dayGridPlugin, interactionPlugin, listPlugin],
      locale: ptBrLocale,
      initialView: 'dayGridMonth',
      headerToolbar: { start: 'prev,today,next', center: 'title', end: 'dayGridMonth,listMonth' },
      // Setas em texto (sem fonte de ícones): mais claras e compatíveis com a CSP
      buttonIcons: false,
      buttonText: { prev: '‹ Anterior', next: 'Próximo ›', today: 'Hoje', month: 'Mês', list: 'Lista' },
      buttonHints: { prev: 'Mês anterior', next: 'Próximo mês', today: 'Ir para o mês atual' },
      viewHint: (buttonText: string) => (buttonText === 'Lista' ? 'Ver em lista' : 'Ver calendário do mês'),
      height: 'auto',
      fixedWeekCount: false,
      dayMaxEvents: false,
      eventDisplay: 'block',
      displayEventTime: true,
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      navLinks: true,
      navLinkHint: 'Agendar em $0',
      navLinkDayClick: (date: Date) => this.dayChosen.emit(toISO(date)),
      dateClick: (info) => this.dayChosen.emit(info.dateStr),
      eventClick: (info) => {
        info.jsEvent.preventDefault();
        this.eventChosen.emit(info.event.id);
      },
      dayCellClassNames: (arg) => (selected && toISO(arg.date) === selected ? ['is-selected'] : []),
      events: this.events(),
      eventContent: (arg: EventContentArg) => {
        const { label, status } = arg.event.extendedProps as { label: string; status: string };
        const wrap = document.createElement('span');
        wrap.className = 'ev__content';
        if (status === 'alerta' || status === 'concluido') {
          const mark = document.createElement('span');
          mark.className = 'ev__mark';
          mark.textContent = status === 'alerta' ? '⚠ ' : '✓ ';
          mark.setAttribute('aria-hidden', 'true');
          wrap.appendChild(mark);
        }
        if (arg.timeText) {
          const time = document.createElement('span');
          time.textContent = `${arg.timeText} `;
          wrap.appendChild(time);
        }
        // Versão completa (telas largas): "Vistoria: Título"
        const full = document.createElement('span');
        full.className = 'ev__full';
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        full.appendChild(strong);
        full.appendChild(document.createTextNode(arg.event.title));
        // Versão curta (celular): abreviação da categoria; o nome completo fica no aria-label
        const short = document.createElement('strong');
        short.className = 'ev__short';
        short.textContent = (arg.event.extendedProps as { short: string }).short;
        wrap.appendChild(full);
        wrap.appendChild(short);
        return { domNodes: [wrap] };
      },
      // Eventos acessíveis por teclado e com nome completo para leitores de tela
      eventDidMount: (info) => {
        const { fullLabel: label, status, client } = info.event.extendedProps as { fullLabel: string; status: string; client: string };
        const state = status === 'alerta' ? 'Alerta de prazo. ' : status === 'concluido' ? 'Concluído. ' : '';
        const name = `${state}${label}: ${info.event.title}, cliente ${client}. Abrir para editar.`;
        info.el.setAttribute('tabindex', '0');
        info.el.setAttribute('role', 'link');
        info.el.setAttribute('aria-label', name);
        info.el.setAttribute('title', name);
        info.el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.eventChosen.emit(info.event.id);
          }
        });
      },
    };
  });
}
