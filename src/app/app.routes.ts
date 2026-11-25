import { Routes } from '@angular/router';
import { AppShell } from './shell/app-shell';
import { authGuard } from './shell/auth.guard';
import { guestGuard } from './shell/guest.guard';
import { HomeLanding } from './shell/home-landing';
import { LoginPage } from './shell/login-page';
import { SurfacePlaceholder } from './shell/surface-placeholder';
import { EmployeesCreatePage } from './surfaces/ux-employees/employees-create-page';
import { EmployeesDetailPage } from './surfaces/ux-employees/employees-detail-page';
import { EmployeesListPage } from './surfaces/ux-employees/employees-list-page';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPage,
    canActivate: [guestGuard],
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: HomeLanding,
      },
      {
        path: 'funcionarios',
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: EmployeesListPage,
          },
          {
            path: 'novo',
            component: EmployeesCreatePage,
          },
          {
            path: ':id',
            component: EmployeesDetailPage,
          },
        ],
      },
      {
        path: 'professores',
        component: SurfacePlaceholder,
        data: { title: 'Professores' },
      },
      {
        path: 'alunos',
        component: SurfacePlaceholder,
        data: { title: 'Alunos' },
      },
      {
        // UX-ROOMS (Grupo 08). Único ponto de contato da superfície com o shell: um
        // `loadChildren`, para a rota do dono não precisar conhecer as telas de dentro.
        path: 'salas',
        loadChildren: () =>
          import('./surfaces/ux-rooms/ux-rooms.routes').then((m) => m.ROOMS_ROUTES),
      },
      {
        path: 'recursos',
        component: SurfacePlaceholder,
        data: { title: 'Recursos' },
      },
      {
        path: 'disciplinas',
        component: SurfacePlaceholder,
        data: { title: 'Disciplinas' },
      },
      {
        path: 'turmas',
        loadChildren: () =>
          import('./surfaces/ux-classes/ux-classes.routes').then(
            (m) => m.UX_CLASSES_ROUTES,
          ),
      },
      {
        path: 'ocupacao',
        component: SurfacePlaceholder,
        data: { title: 'Ocupação' },
      },
      {
        path: 'plano-roster',
        component: SurfacePlaceholder,
        data: { title: 'Plano + roster' },
      },
      {
        path: 'minhas-aulas',
        component: SurfacePlaceholder,
        data: { title: 'Minhas aulas' },
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
