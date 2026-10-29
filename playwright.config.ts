import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const port = 4173;
const data = mkdtempSync(path.join(tmpdir(), 'simple-e2e-'));

// End-to-end tests run against the production build, so production-only behavior (CSRF) is active.
export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.spec.ts',
	use: { baseURL: `http://localhost:${port}` },
	webServer: {
		command: 'npm run build && node build',
		port,
		env: { PORT: String(port), DATABASE_PATH: path.join(data, 'app.db') },
		reuseExistingServer: false
	}
});
