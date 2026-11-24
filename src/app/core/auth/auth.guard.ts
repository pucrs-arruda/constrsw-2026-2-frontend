import { CanActivateFn } from '@angular/router';

// AG-04: stub do authGuard (AG-05 implementa validação real com redirecionamento)
export const authGuard: CanActivateFn = () => {
  return true;
};
