import { Routes } from '@angular/router';
import { ClassDetailPage } from './detail/class-detail.page';
import { ClassesListPage } from './list/classes-list.page';

export const UX_CLASSES_ROUTES: Routes = [
  {
    path: '',
    component: ClassesListPage,
  },
  {
    path: ':id',
    component: ClassDetailPage,
  },
];
