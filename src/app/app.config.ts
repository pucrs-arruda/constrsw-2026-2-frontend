import { ApplicationConfig, LOCALE_ID, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { APP_CONFIG, AppConfig, DEFAULT_APP_CONFIG, loadAppConfig } from './core/config/app-config';

registerLocaleData(localePt);

let currentAppConfig: AppConfig = { ...DEFAULT_APP_CONFIG };

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])), // AG-05: interceptor real
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    {
      provide: APP_CONFIG,
      useFactory: () => currentAppConfig,
    },
    provideAppInitializer(async () => {
      currentAppConfig = await loadAppConfig();
    }),
  ],
};
