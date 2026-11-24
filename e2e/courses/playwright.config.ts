import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'courses.e2e.ts',
  outputDir: '../../test-results/courses',
  timeout: 90_000,
  use: {
    baseURL: process.env.E2E_FRONTEND_URL || 'http://localhost:4200',
    channel: process.env.E2E_BROWSER_CHANNEL,
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 800 },
  },
});
