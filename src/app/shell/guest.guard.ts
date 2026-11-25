import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SessionBootstrap } from './session-bootstrap';

/** Guest routes (UX-LOGIN): authed or restored session → HOME stub. */
export const guestGuard: CanActivateFn = () => {
  const bootstrap = inject(SessionBootstrap);
  const router = inject(Router);

  return bootstrap.ensureSession().pipe(
    map((ok) => (ok ? router.createUrlTree(['/']) : true)),
  );
};
