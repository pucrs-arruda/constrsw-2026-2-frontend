import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { routes } from './app.routes';
import { APP_CONFIG, DEFAULT_APP_CONFIG, AppConfig } from './shared/config/app-config';
import { authInterceptor } from './auth/auth.interceptor';

registerLocaleData(localePt, 'pt-BR');

// Configuração mutável para suportar inicialização via fetch
const appConfigState: AppConfig = { ...DEFAULT_APP_CONFIG };

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])), // AG-05: interceptor real
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: APP_CONFIG, useValue: appConfigState },
    provideAppInitializer(async () => {
      try {
        const res = await fetch('/config.json');
        if (res.ok) {
          const data = (await res.json()) as Partial<AppConfig>;
          if (data.oauthBaseUrl) appConfigState.oauthBaseUrl = data.oauthBaseUrl;
          if (data.bffBaseUrl) appConfigState.bffBaseUrl = data.bffBaseUrl;
        }
      } catch {
        // Silenciosamente mantém os valores default se fetch falhar (ex: testes)
      }
    }),
  ],
};
