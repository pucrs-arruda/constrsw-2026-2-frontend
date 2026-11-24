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

export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      return DEFAULT_APP_CONFIG;
    }
    const data = await response.json();
    return {
      oauthBaseUrl: data.oauthBaseUrl || DEFAULT_APP_CONFIG.oauthBaseUrl,
      bffBaseUrl: data.bffBaseUrl || DEFAULT_APP_CONFIG.bffBaseUrl,
    };
  } catch {
    return DEFAULT_APP_CONFIG;
  }
}
