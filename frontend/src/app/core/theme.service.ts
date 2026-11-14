import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'calendario-seguros.tema';

/**
 * Tema claro/escuro. Sem escolha salva, segue a preferência do sistema operacional.
 * O atributo data-theme no <html> é aplicado antes do Angular iniciar (theme-init.js)
 * para evitar um "piscar" de tema claro.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  readonly theme = signal<Theme>(this.initial());

  constructor() {
    this.apply(this.theme());
    // Acompanha mudanças do sistema enquanto o usuário não escolher manualmente
    this.media.addEventListener('change', (e) => {
      if (!this.saved()) this.set(e.matches ? 'dark' : 'light', false);
    });
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark', true);
  }

  private set(theme: Theme, persist: boolean): void {
    this.theme.set(theme);
    this.apply(theme);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* armazenamento indisponível: vale só nesta sessão */
      }
    }
  }

  private apply(theme: Theme): void {
    const root = document.documentElement;
    root.dataset['theme'] = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0A0D11' : '#1A1A1A');
  }

  private saved(): Theme | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  private initial(): Theme {
    return this.saved() ?? (this.media.matches ? 'dark' : 'light');
  }
}
