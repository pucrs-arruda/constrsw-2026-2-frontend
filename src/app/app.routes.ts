import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./shell/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard], // AG-04 cria um stub que retorna true; AG-05 implementa de verdade
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'salas' },
      {
        path: 'salas',
        loadChildren: () => import('./surfaces/ux-rooms/ux-rooms.routes').then((m) => m.ROOMS_ROUTES),
      },
      {
        path: 'em-breve/:slug',
        loadComponent: () => import('./shell/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
