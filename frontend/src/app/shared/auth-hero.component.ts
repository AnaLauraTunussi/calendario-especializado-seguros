import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from './icon.component';

/** Painel de apresentação ao lado do login/cadastro (em telas pequenas, fica abaixo do formulário). */
@Component({
  selector: 'app-auth-hero',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <aside class="auth-hero" aria-label="Sobre o sistema">
      <h2>Prazos de seguros sob controle, sem ruído visual.</h2>
      <p>Uma agenda pensada para corretoras: clara, previsível e acessível.</p>
      <ul class="feature-list">
        <li>
          <span class="feature-list__icon"><app-icon name="bell" /></span>
          <span><strong>Alertas preditivos</strong>Avisos automáticos antes do vencimento de renovações e vistorias.</span>
        </li>
        <li>
          <span class="feature-list__icon"><app-icon name="calendar" /></span>
          <span><strong>Calendário por categoria</strong>Cores, ícones e nomes juntos: nada depende só da cor.</span>
        </li>
        <li>
          <span class="feature-list__icon"><app-icon name="shield" /></span>
          <span><strong>Privacidade (LGPD)</strong>Apenas os dados mínimos para o atendimento.</span>
        </li>
      </ul>
    </aside>
  `,
})
export class AuthHeroComponent {}
