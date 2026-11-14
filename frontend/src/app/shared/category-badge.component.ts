import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Category, categoryInfo, displayLabel } from '../core/models';
import { IconComponent } from './icon.component';

/** Selo de categoria com dupla codificação: ícone + rótulo textual (+ cor de apoio). */
@Component({
  selector: 'app-category-badge',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <span [class]="'badge badge--' + category()">
      <app-icon [name]="info().icon" />
      <span><span class="visually-hidden">Categoria: </span>{{ text() }}</span>
    </span>
  `,
})
export class CategoryBadgeComponent {
  readonly category = input.required<Category>();
  /** Rótulo gravado (usado em "Outros" para o tipo personalizado). */
  readonly label = input<string | null | undefined>(null);
  protected readonly info = computed(() => categoryInfo(this.category()));
  protected readonly text = computed(() => displayLabel(this.category(), this.label()));
}
