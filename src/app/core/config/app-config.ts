import { InjectionToken } from '@angular/core';

export interface AppConfig {
  oauthBaseUrl: string;
  bffBaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const DEFAULT_APP_CONFIG: AppConfig = {
  oauthBaseUrl: '/api/auth',
  bffBaseUrl: '/api/bff',
};
