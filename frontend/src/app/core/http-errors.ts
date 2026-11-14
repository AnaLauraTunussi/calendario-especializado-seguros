import { HttpErrorResponse } from '@angular/common/http';

/** Converte erros da API em mensagens claras e acionáveis, em português. */
export function errorMessage(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';
  }
  if (err.status === 429) {
    return 'Muitas tentativas em pouco tempo. Aguarde 1 minuto e tente novamente.';
  }
  const message = err.error?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && err.status < 500) return message;
  return fallback;
}
