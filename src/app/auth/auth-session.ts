import { HttpContextToken } from '@angular/common/http';

export const UNAVAILABLE_MESSAGE = 'Identidade indisponível.';

// A consulta de identidade deixa o 401 para o guard ou a tela de login tratarem.
export const SKIP_AUTH_RETRY = new HttpContextToken(() => false);
