import { defineConfig } from '@playwright/test';

// Isolates the browser journey from the employee seed/global setup of the real-stack suite.
// HTTP fixtures exercise UI only; real Lessons × Classes integration remains a separate check.
export default defineConfig({
  testDir: './e2e/specs', testMatch: 'lessons-ui.spec.ts', workers: 1,
  timeout: 45_000, expect: { timeout: 10_000 },
  use: { baseURL: process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:4200', browserName: 'chromium', locale: 'pt-BR', screenshot: 'only-on-failure' },
  reporter: [['list']],
});
