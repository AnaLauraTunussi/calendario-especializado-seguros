import { ChangeDetectionStrategy, Component, ElementRef, Injector, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { daysBetween, dueText, formatDate, formatTime, statusOf } from '../core/date-utils';
import { focusAfterRender } from '../core/focus';
import { Appointment } from '../core/models';
import { CategoryBadgeComponent } from './category-badge.component';
import { IconComponent } from './icon.component';

/**
 * Cartão de compromisso. Estados codificados de forma redundante:
 * - Alerta: ícone de aviso + borda tracejada + texto "Alerta de prazo: vence em N dias"
 * - Concluído: ícone de confirmação + borda pontilhada + texto + título riscado
 * A exclusão pede confirmação dentro do próprio cartão (sem pop-up).
 */
@Component({
  selector: 'app-appointment-card',
  standalone: true,
  imports: [RouterLink, IconComponent, CategoryBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      [class]="'card appt appt--' + appointment().category"
      [class.appt--alert]="status() === 'alerta'"
      [class.appt--done]="status() === 'concluido'"
      [attr.aria-labelledby]="uid() + '-titulo'"
    >
      @if (status() === 'alerta') {
        <p class="appt__flag">
          <app-icon name="pi-exclamation-triangle" />
          <strong>Alerta de prazo: {{ due() }}</strong>
        </p>
      } @else if (status() === 'concluido') {
        <p class="appt__flag">
          <app-icon name="check-circle" />
          <strong>Concluído</strong>
        </p>
      }

      <div><app-category-badge [category]="appointment().category" [label]="appointment().accessibleLabel" /></div>

      <h3 class="appt__title" [id]="uid() + '-titulo'">{{ appointment().title }}</h3>

      <dl class="appt__meta">
        <div>
          <dt>Cliente</dt>
          <dd>{{ appointment().clientName }}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>
            {{ date() }}
            @if (time()) {
              às {{ time() }}
            }
          </dd>
        </div>
        @if (status() === 'pendente') {
          <div>
            <dt>Prazo</dt>
            <dd>{{ due() }}</dd>
          </div>
        }
        @if (status() !== 'concluido' && !compact()) {
          <div>
            <dt>Alerta</dt>
            <dd>
              {{ status() === 'alerta' ? 'Ativo desde' : 'A partir de' }} {{ alertDate() }}
              ({{ leadText() }} antes)
            </dd>
          </div>
        }
        @if (appointment().notes && !compact()) {
          <div>
            <dt>Observações</dt>
            <dd>{{ appointment().notes }}</dd>
          </div>
        }
      </dl>

      @if (confirmingComplete()) {
        <!-- Verificação: concluir em dia diferente do agendado pede confirmação (sem pop-up) -->
        <div class="confirm confirm--warning" role="group" [attr.aria-labelledby]="uid() + '-confirmar-conclusao'">
          <p [id]="uid() + '-confirmar-conclusao'" tabindex="-1" #confirmCompleteText>
            <app-icon name="pi-exclamation-triangle" />
            @if (daysToDate() > 0) {
              <strong>Concluir antes da data?</strong>
              Este compromisso está marcado para {{ date() }}: {{ daysToDate() === 1 ? 'falta 1 dia' : 'faltam ' + daysToDate() + ' dias' }}.
              Confirme só se ele já foi realizado ou resolvido.
            } @else {
              <strong>Concluir com atraso?</strong>
              Este compromisso estava marcado para {{ date() }}: {{ -daysToDate() === 1 ? 'há 1 dia' : 'há ' + -daysToDate() + ' dias' }}.
              Confirme para registrar a conclusão hoje.
            }
          </p>
          <div class="actions">
            <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="confirmComplete()">
              <app-icon name="check-circle" />
              <span>Sim, concluir agora</span>
            </button>
            <button type="button" class="btn" (click)="cancelComplete()">Cancelar</button>
          </div>
        </div>
      } @else if (!confirming()) {
        <div class="actions">
          @if (status() !== 'concluido') {
            <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="askComplete()" #completeButton>
              <app-icon name="check-circle" />
              <span>{{ compact() ? 'Concluir' : 'Marcar como concluído' }}<span class="visually-hidden">: {{ appointment().title }}</span></span>
            </button>
          }
          <a class="btn" [routerLink]="['/compromissos', appointment().id, 'editar']">
            <app-icon name="edit" />
            <span>{{ compact() ? 'Detalhes' : 'Editar' }}<span class="visually-hidden">: {{ appointment().title }}</span></span>
          </a>
          @if (!compact()) {
            <button type="button" class="btn btn-danger-outline" [disabled]="busy()" (click)="askRemove()" #removeButton>
              <app-icon name="trash" />
              <span>Excluir<span class="visually-hidden">: {{ appointment().title }}</span></span>
            </button>
          }
        </div>
      } @else {
        <div class="confirm" role="group" [attr.aria-labelledby]="uid() + '-confirmar'">
          <p [id]="uid() + '-confirmar'" tabindex="-1" #confirmText>
            <strong>Excluir "{{ appointment().title }}"?</strong> Esta ação não pode ser desfeita.
          </p>
          <div class="actions">
            <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="remove.emit(appointment())">
              <app-icon name="trash" />
              <span>Sim, excluir</span>
            </button>
            <button type="button" class="btn" (click)="cancelRemove()">Cancelar</button>
          </div>
        </div>
      }
    </article>
  `,
})
export class AppointmentCardComponent {
  readonly appointment = input.required<Appointment>();
  readonly today = input.required<string>();
  readonly busy = input(false);
  /** Prefixo dos ids HTML: o mesmo compromisso pode aparecer no painel de alertas e na lista. */
  readonly context = input('lista');
  /** Versão resumida (painel lateral): sem observações e sem exclusão. */
  readonly compact = input(false);
  readonly complete = output<Appointment>();
  readonly remove = output<Appointment>();
  private readonly injector = inject(Injector);

  protected readonly confirming = signal(false);
  private readonly confirmText = viewChild<ElementRef<HTMLElement>>('confirmText');
  private readonly removeButton = viewChild<ElementRef<HTMLElement>>('removeButton');
  private readonly completeButton = viewChild<ElementRef<HTMLElement>>('completeButton');
  private readonly confirmCompleteText = viewChild<ElementRef<HTMLElement>>('confirmCompleteText');

  protected readonly confirmingComplete = signal(false);
  /** Dias entre hoje e a data agendada (positivo = futuro, negativo = passado). */
  protected readonly daysToDate = computed(() => daysBetween(this.today(), this.appointment().appointmentDate));

  protected readonly uid = computed(() => `${this.context()}-${this.appointment().id}`);

  protected readonly status = computed(() => statusOf(this.appointment(), this.today()));
  protected readonly due = computed(() => dueText(this.appointment().appointmentDate, this.today()));
  protected readonly date = computed(() => formatDate(this.appointment().appointmentDate));
  protected readonly time = computed(() => formatTime(this.appointment().appointmentTime));
  protected readonly alertDate = computed(() => formatDate(this.appointment().alertTriggerDate));
  protected readonly leadText = computed(() => {
    const days = this.appointment().alertLeadDays;
    return days === 1 ? '1 dia' : `${days} dias`;
  });

  /** Concluir no dia agendado é direto; em outro dia, pede confirmação no próprio cartão. */
  protected askComplete(): void {
    if (this.daysToDate() === 0) {
      this.complete.emit(this.appointment());
      return;
    }
    this.confirmingComplete.set(true);
    focusAfterRender(this.injector, () => this.confirmCompleteText()?.nativeElement);
  }

  protected confirmComplete(): void {
    this.confirmingComplete.set(false);
    this.complete.emit(this.appointment());
  }

  protected cancelComplete(): void {
    this.confirmingComplete.set(false);
    focusAfterRender(this.injector, () => this.completeButton()?.nativeElement);
  }

  protected askRemove(): void {
    this.confirming.set(true);
    focusAfterRender(this.injector, () => this.confirmText()?.nativeElement);
  }

  protected cancelRemove(): void {
    this.confirming.set(false);
    focusAfterRender(this.injector, () => this.removeButton()?.nativeElement);
  }
}
