import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthSession } from './auth-session';

/** Attach Bearer only to BFF base URLs; never to oauth login/refresh/logout. */
export const bearerInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSession);
  const token = session.accessToken;
  if (!token) {
    return next(req);
  }

  const bffBase = environment.bffBaseUrl.replace(/\/$/, '');
  const isBff =
    req.url === bffBase ||
    req.url.startsWith(`${bffBase}/`) ||
    // Absolute URLs that still target the same-origin BFF prefix
    (() => {
      try {
        const path = new URL(req.url, 'http://local.invalid').pathname;
        return path === bffBase || path.startsWith(`${bffBase}/`);
      } catch {
        return false;
      }
    })();
  if (!isBff) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
