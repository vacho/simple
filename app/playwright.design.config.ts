import { defineConfig, devices } from '@playwright/test';

// npm run design:capture (ADR 0030): reference captures of the shipped screens, not a test suite.
// The capture starts its own apps on demo databases (tests/design/capture.spec.ts).
export default defineConfig({
	testDir: 'tests/design',
	testMatch: 'capture.spec.ts',
	workers: 1,
	use: { extraHTTPHeaders: { 'x-forwarded-proto': 'http' } },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
