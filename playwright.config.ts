import { defineConfig } from '@playwright/test';

const port = 4173;

// End-to-end tests run against the production build, so production-only behavior (CSRF) is active.
export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.spec.ts',
	use: { baseURL: `http://localhost:${port}` },
	webServer: {
		command: 'npm run build && node build',
		port,
		env: { PORT: String(port) },
		reuseExistingServer: false
	}
});
