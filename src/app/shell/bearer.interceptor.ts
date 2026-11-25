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
  if (!req.url.startsWith(bffBase)) {
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
