import { Routes } from '@angular/router';
import { authGuard } from './shell/auth.guard';
import { guestGuard } from './shell/guest.guard';
import { HomeStubPage } from './shell/home-stub-page';
import { LoginPage } from './shell/login-page';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPage,
    canActivate: [guestGuard],
  },
  {
    path: 'home',
    component: HomeStubPage,
    canActivate: [authGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    component: HomeStubPage,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
