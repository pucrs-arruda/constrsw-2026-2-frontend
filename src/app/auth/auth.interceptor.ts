import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, of, switchMap, throwError } from 'rxjs';
import { APP_CONFIG } from '../shared/config/app-config';
import { AuthService } from './auth.service';
import { SKIP_AUTH_RETRY } from './auth-session';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(APP_CONFIG);
  const belongsTo = (base: string) =>
    request.url === base ||
    request.url.startsWith(`${base}/`) ||
    request.url.startsWith(`${base}?`);

  if (belongsTo(config.oauthBaseUrl)) {
    return next(request.clone({ withCredentials: true }));
  }
  if (!belongsTo(config.bffBaseUrl)) return next(request);

  const auth = inject(AuthService);
  const router = inject(Router);
  const session = auth.sessionVersion;
  const token = auth.accessToken();
  const authenticatedRequest = (bearer: string | null) =>
    request.clone({
      withCredentials: true,
      headers: bearer ? request.headers.set('Authorization', `Bearer ${bearer}`) : request.headers,
    });
  const unauthorized = (error: unknown) =>
    error instanceof HttpErrorResponse && error.status === 401;
  const redirectToLogin = () => {
    const destination = router.createUrlTree(['/login']).toString();
    const pending = router.currentNavigation()?.initialUrl.toString();
    if (![router.url, pending].some((url) => url?.split(/[?#]/)[0] === destination)) {
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
  };

  return next(authenticatedRequest(token)).pipe(
    catchError((error: unknown) => {
      if (
        !unauthorized(error) ||
        request.context.get(SKIP_AUTH_RETRY) ||
        session !== auth.sessionVersion
      ) {
        return throwError(() => error);
      }

      // Uma resposta atrasada pode chegar após o refresh de outra requisição.
      const current = auth.accessToken();
      const refreshed = current && current !== token ? of(true) : from(auth.refresh());
      return refreshed.pipe(
        switchMap((ok) => {
          if (!ok) {
            // O refresh já limpou a sessão. A primeira falha conduz a navegação.
            if (auth.sessionVersion === session + 1 && !auth.accessToken()) redirectToLogin();
            return throwError(() => error);
          }
          if (session !== auth.sessionVersion) return throwError(() => error);

          const retryToken = auth.accessToken();
          return next(authenticatedRequest(retryToken)).pipe(
            catchError((retryError: unknown) => {
              if (
                unauthorized(retryError) &&
                session === auth.sessionVersion &&
                retryToken === auth.accessToken()
              ) {
                auth.clearSession();
                redirectToLogin();
              }
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
