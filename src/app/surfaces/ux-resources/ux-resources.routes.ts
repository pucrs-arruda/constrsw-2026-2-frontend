import { Routes } from '@angular/router';
import { SurfacePlaceholder } from '../../shell/surface-placeholder';
import { ResourcesListPage } from './resources-list-page';

export const UX_RESOURCES_ROUTES: Routes = [
  {
    path: '',
    component: ResourcesListPage,
  },
  {
    // Detail page (Figma 15) lands with stories 6.3/6.4.
    path: ':id',
    component: SurfacePlaceholder,
    data: { title: 'Recurso' },
  },
];
