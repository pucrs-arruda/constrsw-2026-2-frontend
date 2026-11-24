import { CanActivateFn } from '@angular/router';

// AG-04: stub que retorna true; AG-05 implementa a verificação real
export const authGuard: CanActivateFn = () => {
  return true;
};
