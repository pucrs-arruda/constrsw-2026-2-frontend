import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UNAVAILABLE_MESSAGE } from './auth-session';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.identity()) return true;

  const login = router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  const unavailable = () =>
    new RedirectCommand(login, { state: { authError: UNAVAILABLE_MESSAGE } });
  try {
    if (auth.accessToken() && (await auth.loadIdentity())) return true;
    if ((await auth.refresh()) && (await auth.loadIdentity())) return true;
    return auth.refreshUnavailable() ? unavailable() : login;
  } catch {
    return unavailable();
  }
};
