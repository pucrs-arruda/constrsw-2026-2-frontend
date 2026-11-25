import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SessionBootstrap } from './session-bootstrap';

/** Authenticated routes: boot refresh once if memory empty, else LOGIN. */
export const authGuard: CanActivateFn = () => {
  const bootstrap = inject(SessionBootstrap);
  const router = inject(Router);

  return bootstrap.ensureSession().pipe(
    map((ok) => (ok ? true : router.createUrlTree(['/login']))),
  );
};
