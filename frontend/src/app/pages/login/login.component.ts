import { ChangeDetectionStrategy, Component, ElementRef, Injector, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { focusAfterRender } from '../../core/focus';
import { errorMessage } from '../../core/http-errors';
import { AuthHeroComponent } from '../../shared/auth-hero.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, AuthHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-layout">
      <div class="auth-form-col">
      <header class="page-header">
        <h1 tabindex="-1">Entrar</h1>
        <p class="lead">Acesse sua agenda de vistorias, renovações e sinistros.</p>
      </header>

      @if (auth.notice()) {
        <div class="message message--info" role="status">
          <app-icon name="info" />
          <div><p>{{ auth.notice() }}</p></div>
        </div>
      }

      @if (serverError()) {
        <div class="message message--error" role="alert" tabindex="-1" #errorBox>
          <app-icon name="error" />
          <div><p><strong>Não foi possível entrar.</strong> {{ serverError() }}</p></div>
        </div>
      }

      <form class="card form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="email">E-mail</label>
          <input
            id="email"
            class="input"
            type="email"
            formControlName="email"
            autocomplete="email"
            inputmode="email"
            [attr.aria-invalid]="showError('email')"
            [attr.aria-describedby]="showError('email') ? 'email-erro' : null"
          />
          @if (showError('email')) {
            <p class="field__error" id="email-erro">
              <app-icon name="error" />
              <span>{{ form.controls.email.hasError('required') ? 'Informe seu e-mail.' : 'Informe um e-mail válido, como nome@corretora.com.br.' }}</span>
            </p>
          }
        </div>

        <div class="field">
          <label for="senha">Senha</label>
          <div class="password-row">
            <input
              id="senha"
              class="input"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="showError('password')"
              [attr.aria-describedby]="showError('password') ? 'senha-erro' : null"
            />
            <button
              type="button"
              class="btn"
              [attr.aria-pressed]="showPassword()"
              aria-controls="senha"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? 'Ocultar' : 'Mostrar' }}<span class="visually-hidden"> senha</span>
            </button>
          </div>
          @if (showError('password')) {
            <p class="field__error" id="senha-erro">
              <app-icon name="error" />
              <span>Informe sua senha.</span>
            </p>
          }
        </div>

        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>

      <p class="auth-switch">
        Ainda não tem conta? <a routerLink="/cadastro">Criar conta</a>
      </p>
      </div>
      <app-auth-hero />
    </div>
  `,
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly errorBox = viewChild<ElementRef<HTMLElement>>('errorBox');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected showError(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    if (this.form.invalid) {
      const firstInvalid = this.form.controls.email.invalid ? 'email' : 'senha';
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/agenda']),
      error: (err) => {
        this.loading.set(false);
        this.serverError.set(errorMessage(err, 'Verifique seu e-mail e senha e tente novamente.'));
        focusAfterRender(this.injector, () => this.errorBox()?.nativeElement);
      },
    });
  }
}
