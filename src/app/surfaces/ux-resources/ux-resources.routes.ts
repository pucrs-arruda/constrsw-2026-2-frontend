import { Routes } from '@angular/router';
import { ResourcesDetailPage } from './resources-detail-page';
import { ResourcesListPage } from './resources-list-page';

export const UX_RESOURCES_ROUTES: Routes = [
  {
    path: '',
    component: ResourcesListPage,
  },
  {
    path: ':id',
    component: ResourcesDetailPage,
  },
];
