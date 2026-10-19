import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  forbidOnly: !!process.env.CI,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5194',
    browserName: 'chromium',
    serviceWorkers: 'block',
    permissions: ['clipboard-read', 'clipboard-write'],
    acceptDownloads: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone-sized', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    // Dedicated UI-only config: never starts the API, scheduler or database.
    command: 'vite --config tests/e2e/vite.config.ts',
    url: 'http://127.0.0.1:5194',
    reuseExistingServer: false,
  },
})
