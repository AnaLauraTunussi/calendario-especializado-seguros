import { ChangeDetectionStrategy, Component, ElementRef, Injector, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { focusAfterRender } from '../../core/focus';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AnnouncerService } from '../../core/announcer.service';
import { AppointmentsService } from '../../core/appointments.service';
import { addDays, formatDate, isValidISODate, todayISO } from '../../core/date-utils';
import { errorMessage } from '../../core/http-errors';
import { AppointmentPayload, CATEGORIES, CUSTOM_LABEL_MAX, Category } from '../../core/models';
import { CategoryBadgeComponent } from '../../shared/category-badge.component';
import { IconComponent } from '../../shared/icon.component';

type Field = 'title' | 'clientName' | 'category' | 'customLabel' | 'appointmentDate' | 'alertLeadDays' | 'notes';

/** Ordem visual dos campos, id do elemento a focar e mensagem de erro. */
const FIELDS: { name: Field; id: string; label: string }[] = [
  { name: 'title', id: 'titulo', label: 'Título' },
  { name: 'clientName', id: 'cliente', label: 'Nome do cliente' },
  { name: 'category', id: 'categoria-Renewal', label: 'Categoria' },
  { name: 'customLabel', id: 'tipo-outros', label: 'Tipo de compromisso' },
  { name: 'appointmentDate', id: 'data', label: 'Data do compromisso' },
  { name: 'alertLeadDays', id: 'antecedencia', label: 'Antecedência do alerta' },
  { name: 'notes', id: 'observacoes', label: 'Observações' },
];

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, CategoryBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <a routerLink="/agenda" class="back-link">← Voltar para Agenda</a>
        <h1 tabindex="-1">{{ id() ? 'Editar compromisso' : 'Novo compromisso' }}</h1>
        <p class="lead">Campos marcados com "(obrigatório)" precisam ser preenchidos.</p>
      </div>
    </header>

    @if (loading()) {
      <p role="status">Carregando compromisso…</p>
    } @else if (loadError()) {
      <div class="message message--error" role="alert">
        <app-icon name="error" />
        <div>
          <p><strong>Não foi possível abrir este compromisso.</strong> {{ loadError() }}</p>
          <a routerLink="/agenda">Voltar para a agenda</a>
        </div>
      </div>
    } @else {
      @if (errorSummary().length > 0) {
        <div class="message message--error" role="alert" tabindex="-1" #summary>
          <app-icon name="error" />
          <div>
            <p><strong>Corrija {{ errorSummary().length === 1 ? 'o campo abaixo' : 'os campos abaixo' }} para salvar:</strong></p>
            <ul>
              @for (e of errorSummary(); track e.id) {
                <li><button type="button" class="btn-link" (click)="focusField(e.id)">{{ e.text }}</button></li>
              }
            </ul>
          </div>
        </div>
      }

      @if (serverError()) {
        <div class="message message--error" role="alert" tabindex="-1" #serverBox>
          <app-icon name="error" />
          <div><p><strong>Não foi possível salvar.</strong> {{ serverError() }}</p></div>
        </div>
      }

      <div class="form-layout">
      <form [class]="'card form form--' + (formValue().category || 'none')" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <!-- Título -->
        <div class="field">
          <label for="titulo">Título <span class="field__required">(obrigatório)</span></label>
          <p class="field__hint" id="titulo-dica">Exemplo: Renovação apólice auto.</p>
          <input id="titulo" class="input" type="text" formControlName="title" maxlength="150" autocomplete="off"
                 [attr.aria-invalid]="showError('title')"
                 [attr.aria-describedby]="describedBy('title', 'titulo-dica')" />
          @if (showError('title')) {
            <p class="field__error" id="title-erro"><app-icon name="error" /><span>{{ messageFor('title') }}</span></p>
          }
        </div>

        <!-- Cliente (LGPD: apenas o nome) -->
        <div class="field">
          <label for="cliente">Nome do cliente <span class="field__required">(obrigatório)</span></label>
          <p class="field__hint" id="cliente-dica">
            Informe apenas o nome. Não registre CPF, RG, dados bancários ou de saúde.
          </p>
          <input id="cliente" class="input" type="text" formControlName="clientName" maxlength="150" autocomplete="off"
                 [attr.aria-invalid]="showError('clientName')"
                 [attr.aria-describedby]="describedBy('clientName', 'cliente-dica')" />
          @if (showError('clientName')) {
            <p class="field__error" id="clientName-erro"><app-icon name="error" /><span>{{ messageFor('clientName') }}</span></p>
          }
        </div>

        <!-- Categoria: opções grandes com ícone + texto -->
        <fieldset class="field" [attr.aria-describedby]="showError('category') ? 'category-erro' : null">
          <legend>Categoria <span class="field__required">(obrigatório)</span></legend>
          <div class="choice-list">
            @for (c of categories; track c.value) {
              <label [class]="'choice choice--' + c.value" [for]="'categoria-' + c.value">
                <input type="radio" [id]="'categoria-' + c.value" formControlName="category" [value]="c.value" />
                <app-icon [name]="c.icon" />
                <span class="choice__label">{{ c.label }}</span>
              </label>
            }
          </div>
          @if (showError('category')) {
            <p class="field__error" id="category-erro"><app-icon name="error" /><span>{{ messageFor('category') }}</span></p>
          }
        </fieldset>

        <!-- Só para "Outros": nome do tipo personalizado -->
        @if (formValue().category === 'Other') {
          <div class="field">
            <label for="tipo-outros">Qual tipo de compromisso? <span class="field__required">(opcional)</span></label>
            <p class="field__hint" id="tipo-outros-dica">
              Ex.: Cobrança, Entrega de documentos, Visita técnica. Até {{ customMax }} caracteres.
            </p>
            <input id="tipo-outros" class="input" type="text" formControlName="customLabel" [attr.maxlength]="customMax"
                   autocomplete="off"
                   [attr.aria-invalid]="showError('customLabel')"
                   [attr.aria-describedby]="describedBy('customLabel', 'tipo-outros-dica')" />
            @if (showError('customLabel')) {
              <p class="field__error" id="customLabel-erro"><app-icon name="error" /><span>{{ messageFor('customLabel') }}</span></p>
            }
          </div>
        }

        <!-- Data -->
        <div class="field">
          <label for="data">Data do compromisso <span class="field__required">(obrigatório)</span></label>
          <input id="data" class="input input--short" type="date" formControlName="appointmentDate"
                 [attr.aria-invalid]="showError('appointmentDate')"
                 [attr.aria-describedby]="describedBy('appointmentDate', null)" />
          @if (showError('appointmentDate')) {
            <p class="field__error" id="appointmentDate-erro"><app-icon name="error" /><span>{{ messageFor('appointmentDate') }}</span></p>
          }
        </div>

        <!-- Horário -->
        <div class="field">
          <label for="horario">Horário <span class="field__required">(opcional)</span></label>
          <input id="horario" class="input input--short" type="time" formControlName="appointmentTime" />
        </div>

        <!-- Antecedência do alerta + cálculo automático -->
        <div class="field">
          <label for="antecedencia">Avisar com quantos dias de antecedência? <span class="field__required">(obrigatório)</span></label>
          <p class="field__hint" id="antecedencia-dica">De 1 a 365 dias. Para renovações, o usual é 30 dias.</p>
          <input id="antecedencia" class="input input--short" type="number" inputmode="numeric" min="1" max="365" step="1"
                 formControlName="alertLeadDays"
                 [attr.aria-invalid]="showError('alertLeadDays')"
                 [attr.aria-describedby]="describedBy('alertLeadDays', 'antecedencia-dica alerta-previsto')" />
          @if (showError('alertLeadDays')) {
            <p class="field__error" id="alertLeadDays-erro"><app-icon name="error" /><span>{{ messageFor('alertLeadDays') }}</span></p>
          }
          <div class="preview" id="alerta-previsto">
            <app-icon name="bell" />
            <p>{{ alertPreview() }}</p>
          </div>
        </div>

        <!-- Observações -->
        <div class="field">
          <label for="observacoes">Observações <span class="field__required">(opcional)</span></label>
          <p class="field__hint" id="observacoes-dica">Até 1000 caracteres. Não inclua dados pessoais sensíveis.</p>
          <textarea id="observacoes" class="input" formControlName="notes" maxlength="1000"
                    [attr.aria-invalid]="showError('notes')"
                    [attr.aria-describedby]="describedBy('notes', 'observacoes-dica')"></textarea>
          @if (showError('notes')) {
            <p class="field__error" id="notes-erro"><app-icon name="error" /><span>{{ messageFor('notes') }}</span></p>
          }
        </div>

        <div class="actions">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Salvando…' : 'Salvar compromisso' }}
          </button>
          <a routerLink="/agenda" class="btn">Cancelar</a>
        </div>
      </form>

      <!-- Prévia ao vivo: atualiza conforme o preenchimento -->
      <aside class="form-aside" aria-label="Prévia do compromisso">
        <div [class]="'card preview-card preview-card--' + (formValue().category || 'none')">
          <p class="eyebrow">Prévia</p>
          @if (formValue().category; as cat) {
            <div><app-category-badge [category]="cat" [label]="cat === 'Other' ? formValue().customLabel : null" /></div>
          } @else {
            <p class="preview-card__placeholder">Escolha uma categoria</p>
          }
          <h2 class="preview-card__title">
            @if (formValue().title?.trim()) {
              {{ formValue().title }}
            } @else {
              <span class="preview-card__placeholder">Título do compromisso</span>
            }
          </h2>
          <dl class="appt__meta">
            <div>
              <dt>Cliente</dt>
              <dd>{{ formValue().clientName?.trim() || '—' }}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{{ previewDate() }}</dd>
            </div>
          </dl>
          <div class="preview">
            <app-icon name="bell" />
            <p>{{ alertPreview() }}</p>
          </div>
        </div>

        <div class="card">
          <h2 class="panel-title"><app-icon name="shield" /><span>Privacidade (LGPD)</span></h2>
          <ul class="tips">
            <li><app-icon name="check-circle" /><span>Registre só o nome do cliente ou da empresa.</span></li>
            <li><app-icon name="check-circle" /><span>Não informe CPF, RG, dados bancários ou de saúde.</span></li>
            <li><app-icon name="check-circle" /><span>Use as observações apenas para o que for necessário ao atendimento.</span></li>
          </ul>
        </div>
      </aside>
      </div>
    }
  `,
})
export class AppointmentFormComponent implements OnInit {
  /** Preenchido pela rota /compromissos/:id/editar (withComponentInputBinding). */
  readonly id = input<string>();
  /** Vindos do calendário: /compromissos/novo?data=AAAA-MM-DD&categoria=Renewal */
  readonly data = input<string>();
  readonly categoria = input<string>();

  private readonly api = inject(AppointmentsService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly announcer = inject(AnnouncerService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');
  private readonly serverBox = viewChild<ElementRef<HTMLElement>>('serverBox');

  protected readonly categories = CATEGORIES;
  protected readonly customMax = CUSTOM_LABEL_MAX;

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    clientName: ['', [Validators.required, Validators.maxLength(150)]],
    category: this.fb.control<Category | ''>('', Validators.required),
    appointmentDate: ['', Validators.required],
    appointmentTime: [''],
    alertLeadDays: this.fb.control<number | null>(30, [
      Validators.required,
      Validators.min(1),
      Validators.max(365),
      Validators.pattern(/^\d+$/),
    ]),
    notes: ['', Validators.maxLength(1000)],
    customLabel: ['', Validators.maxLength(CUSTOM_LABEL_MAX)],
  });

  protected readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errorSummary = signal<{ id: string; text: string }[]>([]);

  /** RF03: prévia do cálculo automático do alerta (data − antecedência). */
  protected readonly alertPreview = computed(() => {
    const { appointmentDate, alertLeadDays } = this.formValue();
    const days = Number(alertLeadDays);
    if (!isValidISODate(appointmentDate) || !Number.isInteger(days) || days < 1 || days > 365) {
      return 'Preencha a data e a antecedência para ver quando o alerta será exibido.';
    }
    const trigger = addDays(appointmentDate, -days);
    if (trigger <= todayISO()) {
      return `O alerta ficará ativo assim que você salvar (data de aviso: ${formatDate(trigger)}).`;
    }
    return `O alerta será exibido a partir de ${formatDate(trigger)}.`;
  });

  /** Data e horário formatados para a prévia. */
  protected readonly previewDate = computed(() => {
    const { appointmentDate, appointmentTime } = this.formValue();
    if (!isValidISODate(appointmentDate)) return '—';
    return appointmentTime ? `${formatDate(appointmentDate)} às ${appointmentTime.slice(0, 5)}` : formatDate(appointmentDate);
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      const data = this.data();
      const categoria = this.categoria();
      if (isValidISODate(data)) this.form.controls.appointmentDate.setValue(data);
      if (CATEGORIES.some((c) => c.value === categoria)) this.form.controls.category.setValue(categoria as Category);
      return;
    }
    this.loading.set(true);
    this.api.get(id).subscribe({
      next: (a) => {
        this.form.setValue({
          title: a.title,
          clientName: a.clientName,
          category: a.category,
          appointmentDate: a.appointmentDate.slice(0, 10),
          appointmentTime: a.appointmentTime ? a.appointmentTime.slice(0, 5) : '',
          alertLeadDays: a.alertLeadDays,
          notes: a.notes ?? '',
          customLabel: a.category === 'Other' && a.accessibleLabel !== 'Outros' ? a.accessibleLabel : '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err, 'O compromisso não foi encontrado.'));
        this.loading.set(false);
      },
    });
  }

  protected showError(name: Field): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected describedBy(name: Field, hintIds: string | null): string | null {
    const ids = [hintIds, this.showError(name) ? `${name}-erro` : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  protected messageFor(name: Field): string {
    const c = this.form.controls[name];
    switch (name) {
      case 'title':
        return c.hasError('required') ? 'Informe o título do compromisso.' : 'O título pode ter no máximo 150 caracteres.';
      case 'clientName':
        return c.hasError('required') ? 'Informe o nome do cliente.' : 'O nome pode ter no máximo 150 caracteres.';
      case 'category':
        return 'Escolha uma categoria: Renovação, Vistoria, Sinistro ou Reunião.';
      case 'appointmentDate':
        return 'Informe a data do compromisso no formato dia/mês/ano.';
      case 'alertLeadDays':
        return 'Informe um número inteiro de dias, entre 1 e 365.';
      case 'customLabel':
        return `O tipo pode ter no máximo ${CUSTOM_LABEL_MAX} caracteres.`;
      case 'notes':
        return 'As observações podem ter no máximo 1000 caracteres.';
    }
  }

  protected focusField(id: string): void {
    document.getElementById(id)?.focus();
  }

  protected submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    const invalid = FIELDS.filter((f) => this.form.controls[f.name].invalid);
    if (invalid.length > 0) {
      this.errorSummary.set(invalid.map((f) => ({ id: f.id, text: `${f.label}: ${this.messageFor(f.name)}` })));
      focusAfterRender(this.injector, () => this.summary()?.nativeElement);
      return;
    }
    this.errorSummary.set([]);

    const v = this.form.getRawValue();
    const payload: AppointmentPayload = {
      title: v.title.trim(),
      clientName: v.clientName.trim(),
      category: v.category as Category,
      appointmentDate: v.appointmentDate,
      appointmentTime: v.appointmentTime || null,
      alertLeadDays: Number(v.alertLeadDays),
      notes: v.notes.trim(),
    };
    // "Outros": envia o tipo personalizado (ou "Outros" quando vazio)
    if (payload.category === 'Other') payload.accessibleLabel = v.customLabel.trim() || 'Outros';

    const id = this.id();
    const request = id ? this.api.update(id, payload) : this.api.create(payload);

    this.saving.set(true);
    request.subscribe({
      next: (saved) => {
        this.announcer.flash(id ? `"${saved.title}" foi atualizado.` : `"${saved.title}" foi adicionado à agenda.`);
        this.router.navigate(['/agenda']);
      },
      error: (err) => {
        this.saving.set(false);
        this.serverError.set(errorMessage(err));
        focusAfterRender(this.injector, () => this.serverBox()?.nativeElement);
      },
    });
  }
}
