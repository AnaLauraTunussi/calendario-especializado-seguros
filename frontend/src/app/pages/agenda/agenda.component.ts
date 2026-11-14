import { ChangeDetectionStrategy, Component, ElementRef, Injector, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AnnouncerService } from '../../core/announcer.service';
import { AppointmentsService } from '../../core/appointments.service';
import { AuthService } from '../../core/auth.service';
import { addDays, formatDate, statusOf, todayISO } from '../../core/date-utils';
import { focusAfterRender, mainHeading } from '../../core/focus';
import { errorMessage } from '../../core/http-errors';
import { Appointment, CATEGORIES, Category, categoryInfo, displayLabel } from '../../core/models';
import { AgendaCalendarComponent } from '../../shared/agenda-calendar.component';
import { AppointmentCardComponent } from '../../shared/appointment-card.component';
import { IconComponent, IconName } from '../../shared/icon.component';

type StatusFilter = 'pendentes' | 'alertas' | 'semana' | 'concluidos' | 'todos';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, AppointmentCardComponent, AgendaCalendarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">Hoje é {{ todayText }}</p>
        <h1 tabindex="-1">Minha agenda</h1>
        <p class="lead">Olá, {{ firstName() }}. Acompanhe prazos, vistorias e renovações em um só lugar.</p>
      </div>
      <a routerLink="/compromissos/novo" class="btn btn-primary btn-lg">
        <app-icon name="plus" />
        <span>Novo compromisso</span>
      </a>
    </header>

    @if (flash()) {
      <div class="message message--success" role="status">
        <app-icon name="check-circle" />
        <div><p>{{ flash() }}</p></div>
      </div>
    }

    @if (actionError()) {
      <div class="message message--error" role="alert">
        <app-icon name="error" />
        <div><p>{{ actionError() }}</p></div>
      </div>
    }

    @if (loading()) {
      <p role="status">Carregando seus compromissos…</p>
    } @else if (loadError()) {
      <div class="message message--error" role="alert">
        <app-icon name="error" />
        <div>
          <p><strong>Não foi possível carregar a agenda.</strong> {{ loadError() }}</p>
          <button type="button" class="btn" (click)="load()">Tentar novamente</button>
        </div>
      </div>
    } @else {
      <!-- Resumo: cada indicador filtra a lista abaixo -->
      <ul class="stats" aria-label="Resumo da agenda">
        @for (s of stats(); track s.filter) {
          <li>
            <button
              type="button"
              [class]="'stat stat--' + s.tone"
              [attr.aria-pressed]="statusFilter() === s.filter"
              (click)="showList(s.filter)"
            >
              <span class="stat__icon"><app-icon [name]="s.icon" /></span>
              <span class="stat__value">{{ s.value }}</span>
              <span class="stat__label">{{ s.label }}<span class="visually-hidden">. Mostrar na lista</span></span>
            </button>
          </li>
        }
      </ul>

      <div class="agenda-layout">
      <!-- Calendário mensal (FullCalendar) -->
      <section class="agenda-main" aria-labelledby="calendario-titulo">
        <h2 id="calendario-titulo" class="section-title">
          <app-icon name="calendar" />
          <span>Calendário</span>
        </h2>
        <p class="count">
          Clique em um dia (ou no número do dia, pelo teclado) para agendar.
          Cada cor corresponde a uma categoria, sempre identificada também pelo nome.
        </p>

        <ul class="legend" aria-label="Legenda de categorias">
          @for (c of categories; track c.value) {
            <li [class]="'legend__item legend__item--' + c.value">
              <span class="legend__swatch" aria-hidden="true"></span>
              <app-icon [name]="c.icon" />
              <span>{{ c.label }}</span>
            </li>
          }
          <li class="legend__item"><span aria-hidden="true">⚠</span><span>Alerta de prazo</span></li>
          <li class="legend__item"><span aria-hidden="true">✓</span><span>Concluído</span></li>
        </ul>

        <div class="card calendar-card">
          <app-agenda-calendar
            [appointments]="appointments()"
            [today]="today"
            [selectedDay]="selectedDay()"
            (dayChosen)="chooseDay($event)"
            (eventChosen)="openAppointment($event)"
          />
        </div>

      </section>

      <aside class="agenda-aside" aria-label="Dia escolhido e alertas">
        <!-- Painel do dia escolhido (sem pop-up) -->
        @if (selectedDay(); as day) {
          <div
            [class]="'card day-panel day-panel--' + (chosenCategory() || 'none')"
            role="region"
            aria-labelledby="dia-titulo"
          >
            <h2 id="dia-titulo" class="panel-title" tabindex="-1" #dayTitle>
              <app-icon name="calendar" /><span>Agendar em {{ formatDate(day) }}</span>
            </h2>

            @if (day < today) {
              <p class="field__hint">Atenção: esta data já passou.</p>
            }

            @if (dayAppointments().length > 0) {
              <p><strong>Já marcado neste dia:</strong></p>
              <ul class="day-panel__list">
                @for (a of dayAppointments(); track a.id) {
                  <li>
                    <strong>{{ labelOf(a) }}:</strong> {{ a.title }} — {{ a.clientName }}
                    @if (a.isCompleted) { (concluído) }
                  </li>
                }
              </ul>
            } @else {
              <p>Nenhum compromisso neste dia.</p>
            }

            <fieldset class="field">
              <legend>Qual compromisso você quer agendar?</legend>
              <div class="choice-list">
                @for (c of categories; track c.value) {
                  <label [class]="'choice choice--' + c.value" [for]="'dia-categoria-' + c.value">
                    <input
                      type="radio"
                      name="dia-categoria"
                      [id]="'dia-categoria-' + c.value"
                      [value]="c.value"
                      [checked]="chosenCategory() === c.value"
                      (change)="chosenCategory.set(c.value); categoryHint.set(false)"
                    />
                    <app-icon [name]="c.icon" />
                    <span class="choice__label">{{ c.label }}</span>
                  </label>
                }
              </div>
            </fieldset>

            @if (chosenCategory(); as cat) {
              <p class="day-panel__preview" aria-live="polite">
                Vai aparecer no calendário assim:
                <span [class]="'ev-sample ev-sample--' + cat">
                  <strong>{{ categoryLabel(cat) }}:</strong> novo compromisso
                </span>
              </p>
            }

            <div class="actions">
              @if (chosenCategory(); as cat) {
                <a
                  class="btn btn-primary"
                  routerLink="/compromissos/novo"
                  [queryParams]="{ data: day, categoria: cat }"
                >
                  <app-icon name="plus" />
                  <span>Continuar: {{ categoryLabel(cat) }} em {{ formatShort(day) }}</span>
                </a>
              } @else {
                <button type="button" class="btn btn-primary" aria-disabled="true" (click)="needCategory()">
                  <app-icon name="plus" />
                  <span>Continuar</span>
                </button>
              }
              <button type="button" class="btn" (click)="closeDay()">Cancelar</button>
            </div>
            @if (categoryHint()) {
              <p class="field__error" role="alert">
                <app-icon name="error" /><span>Escolha primeiro o tipo de compromisso.</span>
              </p>
            }
          </div>
        }

      <!-- Painel de alertas preditivos (RF03) -->
      <section class="alerts-panel" aria-labelledby="alertas-titulo">
        <h2 id="alertas-titulo" class="panel-title">
          <app-icon name="bell" />
          <span>Alertas de vencimento ({{ alerts().length }})</span>
        </h2>
        <p class="count">Prazo de aviso já começou. Do mais próximo ao mais distante.</p>
        @if (alerts().length === 0) {
          <p class="empty">Nenhum alerta ativo. Todos os prazos estão em dia.</p>
        } @else {
          <ul class="card-list">
            @for (a of alerts(); track a.id) {
              <li>
                <app-appointment-card
                  [appointment]="a"
                  [today]="today"
                  context="alerta"
                  [compact]="true"
                  [busy]="busyId() === a.id"
                  (complete)="complete($event)"
                  (remove)="remove($event)"
                />
              </li>
            }
          </ul>
        }
      </section>
      </aside>
      </div>

      <!-- Agenda completa -->
      <section class="list-section" aria-labelledby="lista-titulo">
        <div class="section-head">
          <h2 id="lista-titulo" class="section-title" tabindex="-1" #listTitle>
            <app-icon name="list" />
            <span>Compromissos</span>
          </h2>
          <p class="count" role="status">{{ countText() }}</p>
        </div>

        <div class="filters">
          <div class="field">
            <label for="filtro-situacao">Mostrar</label>
            <select id="filtro-situacao" class="input" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
              <option value="pendentes">Pendentes</option>
              <option value="alertas">Alertas ativos</option>
              <option value="semana">Próximos 7 dias</option>
              <option value="concluidos">Concluídos</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <div class="field">
            <label for="filtro-categoria">Categoria</label>
            <select id="filtro-categoria" class="input" [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)">
              <option value="">Todas as categorias</option>
              @for (c of categories; track c.value) {
                <option [value]="c.value">{{ c.label }}</option>
              }
            </select>
          </div>
        </div>

        @if (filtered().length === 0) {
          <p class="empty">Nenhum compromisso encontrado com esses filtros.</p>
        } @else {
          <ul class="card-list card-list--grid">
            @for (a of filtered(); track a.id) {
              <li>
                <app-appointment-card
                  [appointment]="a"
                  [today]="today"
                  [busy]="busyId() === a.id"
                  (complete)="complete($event)"
                  (remove)="remove($event)"
                />
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
})
export class AgendaComponent implements OnInit {
  private readonly api = inject(AppointmentsService);
  private readonly auth = inject(AuthService);
  private readonly announcer = inject(AnnouncerService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly dayTitle = viewChild<ElementRef<HTMLElement>>('dayTitle');
  private readonly listTitle = viewChild<ElementRef<HTMLElement>>('listTitle');

  protected readonly categories = CATEGORIES;
  protected readonly today = todayISO();
  protected readonly todayText = formatDate(this.today);

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly alerts = signal<Appointment[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly flash = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  protected readonly statusFilter = signal<StatusFilter>('pendentes');
  protected readonly categoryFilter = signal<Category | ''>('');

  /** Dia clicado no calendário e tipo de compromisso escolhido no painel. */
  protected readonly selectedDay = signal<string | null>(null);
  protected readonly chosenCategory = signal<Category | null>(null);
  protected readonly categoryHint = signal(false);
  protected readonly dayAppointments = computed(() => {
    const day = this.selectedDay();
    return day ? this.appointments().filter((a) => a.appointmentDate.slice(0, 10) === day) : [];
  });
  protected readonly formatDate = formatDate;

  protected readonly firstName = computed(() => this.auth.user()?.fullName.split(' ')[0] ?? '');

  protected readonly filtered = computed(() => {
    const status = this.statusFilter();
    const category = this.categoryFilter();
    return this.appointments().filter((a) => {
      if (category && a.category !== category) return false;
      const s = statusOf(a, this.today);
      if (status === 'pendentes') return s !== 'concluido';
      if (status === 'alertas') return s === 'alerta';
      if (status === 'semana') return s !== 'concluido' && this.isThisWeek(a);
      if (status === 'concluidos') return s === 'concluido';
      return true;
    });
  });

  /** Indicadores do topo: cada um filtra a lista. */
  protected readonly stats = computed(() => {
    const all = this.appointments();
    const st = all.map((a) => statusOf(a, this.today));
    const items: { filter: StatusFilter; label: string; value: number; icon: IconName; tone: string }[] = [
      { filter: 'alertas', label: 'Alertas ativos', value: st.filter((x) => x === 'alerta').length, icon: 'pi-exclamation-triangle', tone: 'alert' },
      { filter: 'pendentes', label: 'Pendentes', value: st.filter((x) => x !== 'concluido').length, icon: 'clock', tone: 'pending' },
      { filter: 'semana', label: 'Próximos 7 dias', value: all.filter((a, i) => st[i] !== 'concluido' && this.isThisWeek(a)).length, icon: 'calendar', tone: 'week' },
      { filter: 'concluidos', label: 'Concluídos', value: st.filter((x) => x === 'concluido').length, icon: 'check-circle', tone: 'done' },
    ];
    return items;
  });

  private isThisWeek(a: Appointment): boolean {
    const d = a.appointmentDate.slice(0, 10);
    return d >= this.today && d <= addDays(this.today, 7);
  }

  protected showList(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.categoryFilter.set('');
    focusAfterRender(this.injector, () => this.listTitle()?.nativeElement, { scroll: true });
  }

  protected readonly countText = computed(() => {
    const n = this.filtered().length;
    return n === 1 ? '1 compromisso encontrado.' : `${n} compromissos encontrados.`;
  });

  protected categoryLabel(category: Category): string {
    return categoryInfo(category).label;
  }

  protected labelOf(a: Appointment): string {
    return displayLabel(a.category, a.accessibleLabel);
  }

  protected formatShort(iso: string): string {
    return formatDate(iso).split(' ')[0];
  }

  protected chooseDay(iso: string): void {
    this.selectedDay.set(iso);
    this.chosenCategory.set(null);
    this.categoryHint.set(false);
    focusAfterRender(this.injector, () => this.dayTitle()?.nativeElement, { scroll: true });
  }

  protected closeDay(): void {
    this.selectedDay.set(null);
    this.chosenCategory.set(null);
    this.categoryHint.set(false);
  }

  protected needCategory(): void {
    this.categoryHint.set(true);
    focusAfterRender(this.injector, () => document.getElementById('dia-categoria-Renewal'));
  }

  protected openAppointment(id: string): void {
    this.router.navigate(['/compromissos', id, 'editar']);
  }

  ngOnInit(): void {
    this.flash.set(this.announcer.consumeFlash());
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({ list: this.api.list(), alerts: this.api.alerts() }).subscribe({
      next: ({ list, alerts }) => {
        this.appointments.set(list);
        this.alerts.set(alerts);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  /** Recarrega sem exibir "Carregando…", preservando a posição do usuário na página. */
  private refresh(): void {
    forkJoin({ list: this.api.list(), alerts: this.api.alerts() }).subscribe({
      next: ({ list, alerts }) => {
        this.appointments.set(list);
        this.alerts.set(alerts);
      },
      error: (err) => this.actionError.set(errorMessage(err)),
    });
  }

  protected complete(a: Appointment): void {
    this.busyId.set(a.id);
    this.actionError.set(null);
    this.flash.set(null);
    // O cartão já pediu a confirmação ao usuário quando a data não é hoje
    this.api.complete(a.id, a.appointmentDate.slice(0, 10) !== this.today).subscribe({
      next: () => {
        this.busyId.set(null);
        const text = `"${a.title}" foi marcado como concluído.`;
        this.flash.set(text);
        this.announcer.announce(text);
        this.refresh();
        this.focusHeading();
      },
      error: (err) => {
        this.busyId.set(null);
        this.actionError.set(errorMessage(err));
      },
    });
  }

  protected remove(a: Appointment): void {
    this.busyId.set(a.id);
    this.actionError.set(null);
    this.flash.set(null);
    this.api.remove(a.id).subscribe({
      next: () => {
        this.busyId.set(null);
        const text = `"${a.title}" foi excluído da agenda.`;
        this.flash.set(text);
        this.announcer.announce(text);
        this.refresh();
        this.focusHeading();
      },
      error: (err) => {
        this.busyId.set(null);
        this.actionError.set(errorMessage(err));
      },
    });
  }

  /** O cartão acionado deixa de existir ou muda de lugar: o foco volta ao título da página. */
  private focusHeading(): void {
    focusAfterRender(this.injector, mainHeading);
  }
}
