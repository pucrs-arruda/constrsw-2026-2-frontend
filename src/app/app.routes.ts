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
        path: 'salas',
        component: SurfacePlaceholder,
        data: { title: 'Salas de Aula' },
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
        component: SurfacePlaceholder,
        data: { title: 'Turmas' },
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
