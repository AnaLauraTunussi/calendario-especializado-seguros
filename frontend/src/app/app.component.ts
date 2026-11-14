import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';
import { focusAfterRender, mainHeading } from './core/focus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AnnouncerService } from './core/announcer.service';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { IconComponent } from './shared/icon.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#conteudo" (click)="skipToContent($event)">Pular para o conteúdo principal</a>

    <header class="app-header">
      <div class="app-header__inner container">
        <a class="app-brand" [routerLink]="auth.isAuthenticated() ? '/agenda' : '/entrar'">
          <span class="app-brand__logo"><app-icon name="calendar" /></span>
          <span>
            <span class="app-brand__name">Calendário Seguros</span>
            <span class="app-brand__tagline">Agenda especializada para corretoras</span>
          </span>
        </a>

        @if (auth.isAuthenticated()) {
          <nav class="app-nav" aria-label="Principal">
            <ul>
              <li>
                <a routerLink="/agenda" routerLinkActive ariaCurrentWhenActive="page">
                  <app-icon name="calendar" /><span>Agenda</span>
                </a>
              </li>
              <li>
                <a routerLink="/compromissos/novo" routerLinkActive ariaCurrentWhenActive="page">
                  <app-icon name="plus" /><span>Novo<span class="nav-long"> compromisso</span></span>
                </a>
              </li>
              <li>
                <button type="button" (click)="logout()">
                  <app-icon name="logout" /><span>Sair</span>
                </button>
              </li>
            </ul>
          </nav>
        }

        <div class="app-header__tools">
          <button
            type="button"
            class="theme-toggle"
            aria-label="Modo escuro"
            title="Modo escuro"
            [attr.aria-pressed]="theme.theme() === 'dark'"
            (click)="theme.toggle()"
          >
            <app-icon [name]="theme.theme() === 'dark' ? 'moon' : 'sun'" />
            <span class="theme-toggle__text">Modo escuro</span>
          </button>

          @if (auth.user(); as user) {
            <span class="user-chip">
              <span class="user-chip__avatar" aria-hidden="true">{{ initials() }}</span>
              <span class="user-chip__name">{{ user.fullName }}</span>
            </span>
          }
        </div>
      </div>
    </header>

    <main id="conteudo" class="app-main" tabindex="-1">
      <div class="container">
        <router-outlet />
      </div>
    </main>

    <footer class="app-footer">
      <div class="app-footer__inner container">
        <p>Privacidade (LGPD): registre apenas o necessário. Não informe CPF, RG ou dados bancários.</p>
        <p>Calendário Especializado em Seguros</p>
      </div>
    </footer>

    <div class="visually-hidden" aria-live="polite" aria-atomic="true">{{ announcer.message() }}</div>
  `,
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  protected readonly announcer = inject(AnnouncerService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly initials = computed(() => {
    const parts = (this.auth.user()?.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });

  constructor() {
    let firstNavigation = true;
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (firstNavigation) {
          firstNavigation = false;
          return;
        }
        focusAfterRender(this.injector, mainHeading);
      });
  }

  protected skipToContent(event: Event): void {
    event.preventDefault();
    const target = mainHeading() ?? document.getElementById('conteudo');
    target?.focus();
  }

  protected logout(): void {
    this.auth.logout('Você saiu da sua conta.');
  }
}
