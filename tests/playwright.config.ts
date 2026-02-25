import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './dom',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5190',
  },
  webServer: {
    command: 'npx vite --port 5190',
    port: 5190,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
