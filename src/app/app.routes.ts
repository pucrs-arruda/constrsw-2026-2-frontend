import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard], // AG-04 cria um stub que retorna true; AG-05 implementa de verdade
    loadComponent: () => import('./core/layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'salas' },
      {
        path: 'salas',
        loadComponent: () => import('./features/rooms/list/rooms-list.page').then((m) => m.RoomsListPage),
        title: 'Salas de Aula',
      },
      {
        path: 'salas/:id',
        loadComponent: () => import('./features/rooms/detail/room-detail.page').then((m) => m.RoomDetailPage),
        title: 'Sala',
      },
      {
        path: 'em-breve/:slug',
        loadComponent: () => import('./features/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
