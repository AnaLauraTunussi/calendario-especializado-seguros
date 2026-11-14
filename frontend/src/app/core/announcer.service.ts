import { Injectable, signal } from '@angular/core';

/**
 * Comunicação de resultados de ações sem pop-ups invasivos:
 * - announce(): região viva (aria-live) para leitores de tela;
 * - flash(): mensagem visível exibida uma única vez na próxima página.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncerService {
  readonly message = signal('');
  private pendingFlash: string | null = null;

  announce(text: string): void {
    // Limpa e reescreve a região: leitores de tela só anunciam quando o conteúdo MUDA,
    // então a pausa curta garante o anúncio mesmo quando a mesma frase se repete.
    this.message.set('');
    setTimeout(() => this.message.set(text), 50);
  }

  flash(text: string): void {
    this.pendingFlash = text;
  }

  consumeFlash(): string | null {
    const text = this.pendingFlash;
    this.pendingFlash = null;
    return text;
  }
}
