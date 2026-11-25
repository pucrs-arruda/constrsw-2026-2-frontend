import { Routes } from '@angular/router';

export const ROOMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/rooms-list.page').then((m) => m.RoomsListPage),
    title: 'Salas de Aula',
  },
  {
    path: ':id',
    loadComponent: () => import('./detail/room-detail.page').then((m) => m.RoomDetailPage),
    title: 'Sala',
  },
];
