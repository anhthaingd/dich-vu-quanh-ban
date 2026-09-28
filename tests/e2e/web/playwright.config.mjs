import { defineConfig } from '@playwright/test';
const output = process.env.VERIFY_FAILURE_ARTIFACTS === '1' ? '../../../test-results/web-negative' : '../../../test-results/web';
export default defineConfig({
  testDir: '.', testMatch: process.env.VERIFY_FAILURE_ARTIFACTS === '1' ? 'failure-probe.mjs' : '*.spec.mjs', timeout: 90000, expect: { timeout: 10000 },
  fullyParallel: false, workers: 1, retries: 0, forbidOnly: true,
  outputDir: `${output}/artifacts`,
  reporter: [['list'], ['html', { outputFolder: `${output}/html`, open: 'never' }], ['junit', { outputFile: `${output}/junit.xml` }], ['json', { outputFile: `${output}/results.json` }]],
  use: { viewport: { width: 390, height: 844 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure', launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {} },
});
