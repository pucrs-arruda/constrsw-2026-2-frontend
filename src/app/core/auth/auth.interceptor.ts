import { HttpInterceptorFn } from '@angular/common/http';

// AG-04: stub do interceptor (AG-05 implementa withCredentials e refresh single-flight)
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
