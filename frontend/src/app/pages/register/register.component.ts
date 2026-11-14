import { ChangeDetectionStrategy, Component, ElementRef, Injector, inject, signal, viewChild } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AnnouncerService } from '../../core/announcer.service';
import { AuthService } from '../../core/auth.service';
import { focusAfterRender } from '../../core/focus';
import { errorMessage } from '../../core/http-errors';
import { AuthHeroComponent } from '../../shared/auth-hero.component';
import { IconComponent } from '../../shared/icon.component';

type Field = 'fullName' | 'email' | 'password' | 'confirmPassword';

const FIELD_IDS: Record<Field, string> = {
  fullName: 'nome',
  email: 'email',
  password: 'senha',
  confirmPassword: 'confirmar-senha',
};

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, AuthHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-layout">
      <div class="auth-form-col">
      <header class="page-header">
        <h1 tabindex="-1">Criar conta</h1>
        <p class="lead">Todos os campos são obrigatórios.</p>
      </header>

      @if (serverError()) {
        <div class="message message--error" role="alert" tabindex="-1" #errorBox>
          <app-icon name="error" />
          <div><p><strong>Não foi possível criar a conta.</strong> {{ serverError() }}</p></div>
        </div>
      }

      <form class="card form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="nome">Nome completo</label>
          <input id="nome" class="input" type="text" formControlName="fullName" autocomplete="name"
                 [attr.aria-invalid]="showError('fullName')"
                 [attr.aria-describedby]="showError('fullName') ? 'nome-erro' : null" />
          @if (showError('fullName')) {
            <p class="field__error" id="nome-erro">
              <app-icon name="error" /><span>Informe seu nome com pelo menos 3 letras.</span>
            </p>
          }
        </div>

        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="email" inputmode="email"
                 [attr.aria-invalid]="showError('email')"
                 [attr.aria-describedby]="showError('email') ? 'email-erro' : null" />
          @if (showError('email')) {
            <p class="field__error" id="email-erro">
              <app-icon name="error" /><span>Informe um e-mail válido, como nome&#64;corretora.com.br.</span>
            </p>
          }
        </div>

        <div class="field">
          <label for="senha">Senha</label>
          <p class="field__hint" id="senha-dica">Mínimo de 8 caracteres.</p>
          <input id="senha" class="input" type="password" formControlName="password" autocomplete="new-password"
                 [attr.aria-invalid]="showError('password')"
                 [attr.aria-describedby]="showError('password') ? 'senha-dica senha-erro' : 'senha-dica'" />
          @if (showError('password')) {
            <p class="field__error" id="senha-erro">
              <app-icon name="error" /><span>A senha precisa ter pelo menos 8 caracteres.</span>
            </p>
          }
        </div>

        <div class="field">
          <label for="confirmar-senha">Confirme a senha</label>
          <input id="confirmar-senha" class="input" type="password" formControlName="confirmPassword"
                 autocomplete="new-password"
                 [attr.aria-invalid]="showError('confirmPassword')"
                 [attr.aria-describedby]="showError('confirmPassword') ? 'confirmar-erro' : null" />
          @if (showError('confirmPassword')) {
            <p class="field__error" id="confirmar-erro">
              <app-icon name="error" /><span>As duas senhas precisam ser iguais.</span>
            </p>
          }
        </div>

        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
          {{ loading() ? 'Criando conta…' : 'Criar conta' }}
        </button>
      </form>

      <p class="auth-switch">Já tem conta? <a routerLink="/entrar">Entrar</a></p>
      </div>
      <app-auth-hero />
    </div>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly announcer = inject(AnnouncerService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly errorBox = viewChild<ElementRef<HTMLElement>>('errorBox');

  protected readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected showError(name: Field): boolean {
    const control = this.form.controls[name];
    const visible = control.touched || this.submitted();
    if (name === 'confirmPassword') {
      return visible && (control.invalid || this.form.hasError('mismatch'));
    }
    return visible && control.invalid;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    const fields: Field[] = ['fullName', 'email', 'password', 'confirmPassword'];
    const firstInvalid = fields.find((f) => this.showError(f));
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }

    this.loading.set(true);
    const { fullName, email, password } = this.form.getRawValue();
    this.auth.register(fullName, email, password).subscribe({
      next: () => {
        this.announcer.flash('Conta criada com sucesso. Bem-vindo à sua agenda.');
        this.router.navigate(['/agenda']);
      },
      error: (err) => {
        this.loading.set(false);
        this.serverError.set(errorMessage(err));
        focusAfterRender(this.injector, () => this.errorBox()?.nativeElement);
      },
    });
  }
}
