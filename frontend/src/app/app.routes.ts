import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guards';

const APP = 'Calendário Seguros';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'agenda' },
  {
    path: 'entrar',
    title: `Entrar | ${APP}`,
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'cadastro',
    title: `Criar conta | ${APP}`,
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'agenda',
    title: `Minha agenda | ${APP}`,
    canActivate: [authGuard],
    loadComponent: () => import('./pages/agenda/agenda.component').then((m) => m.AgendaComponent),
  },
  {
    path: 'compromissos/novo',
    title: `Novo compromisso | ${APP}`,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/appointment-form/appointment-form.component').then((m) => m.AppointmentFormComponent),
  },
  {
    path: 'compromissos/:id/editar',
    title: `Editar compromisso | ${APP}`,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/appointment-form/appointment-form.component').then((m) => m.AppointmentFormComponent),
  },
  { path: '**', redirectTo: 'agenda' },
];
