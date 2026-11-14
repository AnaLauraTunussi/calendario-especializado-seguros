import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from './api.config';
import { AuthResponse, SessionUser } from './models';

interface StoredSession {
  accessToken: string;
  user: SessionUser;
}

const STORAGE_KEY = 'calendario-seguros.sessao';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private token: string | null = null;
  readonly user = signal<SessionUser | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  /** Aviso exibido na tela de login (ex.: sessão expirada). */
  readonly notice = signal<string | null>(null);

  constructor() {
    this.restore();
  }

  login(email: string, password: string): Observable<void> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/login`, { email: email.trim(), password })
      .pipe(tap((res) => this.store(res)), map(() => undefined));
  }

  register(fullName: string, email: string, password: string): Observable<void> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/register`, {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      })
      .pipe(tap((res) => this.store(res)), map(() => undefined));
  }

  logout(notice: string | null = null): void {
    this.token = null;
    this.user.set(null);
    this.notice.set(notice);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* armazenamento indisponível: nada a limpar */
    }
    this.router.navigate(['/entrar']);
  }

  getToken(): string | null {
    if (this.token && this.isExpired(this.token)) {
      this.logout('Sua sessão expirou. Entre novamente para continuar.');
      return null;
    }
    return this.token;
  }

  private store(res: AuthResponse): void {
    this.token = res.accessToken;
    this.user.set(res.user);
    this.notice.set(null);
    try {
      // LGPD: apenas o token e o mínimo de identificação (sem senha)
      const session: StoredSession = { accessToken: res.accessToken, user: res.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* modo privado: a sessão vale só enquanto a aba estiver aberta */
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const session = JSON.parse(raw) as StoredSession;
      if (!session?.accessToken || this.isExpired(session.accessToken)) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      this.token = session.accessToken;
      this.user.set(session.user);
    } catch {
      /* sessão corrompida ou armazenamento indisponível */
    }
  }

  private isExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const { exp } = JSON.parse(atob(payload)) as { exp?: number };
      return typeof exp === 'number' && exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
