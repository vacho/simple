import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const port = 4173;
const data = mkdtempSync(path.join(tmpdir(), 'simple-e2e-'));
// npm run test:e2e:pseudo: the same production build, started with the en-XA pseudo-locale (D14).
const pseudo = process.env.I18N_PSEUDO === '1';

// End-to-end tests run against the production build, so production-only behavior (CSRF) is active.
export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.spec.ts',
	use: {
		baseURL: `http://localhost:${port}`,
		// The apps the tests start trust this proxy header (tests/e2e/app.ts).
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' },
		...(pseudo && {
			locale: 'en-XA',
			extraHTTPHeaders: { 'x-forwarded-proto': 'http', 'accept-language': 'en-XA' }
		})
	},
	webServer: {
		command: 'npm run build && node build',
		port,
		env: {
			PORT: String(port),
			DATABASE_PATH: path.join(data, 'app.db'),
			I18N_PSEUDO: pseudo ? '1' : ''
		},
		reuseExistingServer: false
	}
});
