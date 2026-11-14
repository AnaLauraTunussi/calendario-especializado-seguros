import { Injector, afterNextRender } from '@angular/core';

/**
 * Move o foco do teclado para um elemento assim que a tela terminar de atualizar.
 *
 * Usado após ações que mudam o conteúdo (mensagens de erro, confirmações,
 * troca de página), para que o leitor de tela anuncie a novidade e o usuário
 * de teclado continue no ponto certo — sem depender de atrasos arbitrários.
 */
export function focusAfterRender(
  injector: Injector,
  target: () => HTMLElement | null | undefined,
  options: { scroll?: boolean } = {},
): void {
  afterNextRender(
    () => {
      const element = target();
      if (!element) return;
      if (options.scroll) element.scrollIntoView({ block: 'start' });
      element.focus({ preventScroll: !!options.scroll });
    },
    { injector },
  );
}

/** Título principal da página (recebe o foco na troca de página). */
export const mainHeading = () => document.querySelector<HTMLElement>('main h1');
