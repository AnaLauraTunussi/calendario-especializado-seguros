// Aplica o tema salvo (ou o do sistema) antes da primeira pintura da página.
(function () {
  var theme = null;
  try { theme = localStorage.getItem('calendario-seguros.tema'); } catch (e) {}
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
})();
