import { HttpInterceptorFn } from '@angular/common/http';

// AG-04: stub que passa adiante; AG-05 implementa withCredentials e refresh de 401
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
