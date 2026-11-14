import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'pi-refresh'
  | 'pi-search'
  | 'pi-exclamation-triangle'
  | 'pi-users'
  | 'pi-tag'
  | 'calendar'
  | 'check-circle'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'logout'
  | 'info'
  | 'error'
  | 'bell'
  | 'sun'
  | 'moon'
  | 'clock'
  | 'shield'
  | 'list';

/**
 * Ícones SVG inline (sem fonte externa). São sempre decorativos (aria-hidden):
 * o significado é transmitido pelo texto que os acompanha (dupla codificação).
 * Os nomes "pi-*" correspondem aos valores gravados em accessible_icon no banco.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      @switch (name()) {
        @case ('pi-refresh') {
          <svg:path d="M20 11a8 8 0 0 0-14.9-3.5" /><svg:path d="M4 4v4h4" />
          <svg:path d="M4 13a8 8 0 0 0 14.9 3.5" /><svg:path d="M20 20v-4h-4" />
        }
        @case ('pi-search') {
          <svg:circle cx="11" cy="11" r="7" /><svg:path d="m20 20-4-4" />
        }
        @case ('pi-exclamation-triangle') {
          <svg:path d="M12 3 2 21h20L12 3z" /><svg:path d="M12 10v5" /><svg:path d="M12 18h.01" />
        }
        @case ('pi-users') {
          <svg:circle cx="9" cy="8" r="3.5" /><svg:path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <svg:circle cx="17" cy="9" r="2.5" /><svg:path d="M16.5 14.2A5 5 0 0 1 21.5 20" />
        }
        @case ('pi-tag') {
          <svg:path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z" /><svg:circle cx="8" cy="8" r="1.5" />
        }
        @case ('calendar') {
          <svg:rect x="3" y="5" width="18" height="16" rx="2" /><svg:path d="M3 10h18M8 3v4M16 3v4" />
        }
        @case ('check-circle') {
          <svg:circle cx="12" cy="12" r="9" /><svg:path d="m8 12 3 3 5-6" />
        }
        @case ('plus') {
          <svg:path d="M12 5v14M5 12h14" />
        }
        @case ('edit') {
          <svg:path d="M4 20h4L19 9l-4-4L4 16v4z" />
        }
        @case ('trash') {
          <svg:path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        }
        @case ('logout') {
          <svg:path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
        }
        @case ('info') {
          <svg:circle cx="12" cy="12" r="9" /><svg:path d="M12 11v6M12 7.5h.01" />
        }
        @case ('error') {
          <svg:circle cx="12" cy="12" r="9" /><svg:path d="m9 9 6 6M15 9l-6 6" />
        }
        @case ('sun') {
          <svg:circle cx="12" cy="12" r="4" /><svg:path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        }
        @case ('moon') {
          <svg:path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        }
        @case ('clock') {
          <svg:circle cx="12" cy="12" r="9" /><svg:path d="M12 7v5l3 2" />
        }
        @case ('shield') {
          <svg:path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3z" /><svg:path d="m9 12 2 2 4-4" />
        }
        @case ('list') {
          <svg:path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
        }
        @case ('bell') {
          <svg:path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2z" /><svg:path d="M10 21h4" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
