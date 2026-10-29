import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const icuParser = '@formatjs/icu-messageformat-parser';

// The browser renders precompiled messages only, so its bundle gets formatjs's no-parser build.
// A resolve.alias would also reach SSR, where the server needs the real parser (D14).
function browserWithoutIcuParser(): Plugin {
	return {
		name: 'browser-without-icu-parser',
		enforce: 'pre',
		resolveId(source, importer) {
			if (source !== icuParser || this.environment.config.consumer !== 'client') return null;
			return this.resolve(`${icuParser}/no-parser.js`, importer, { skipSelf: true });
		}
	};
}

export default defineConfig({
	plugins: [
		browserWithoutIcuParser(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		// Unit and integration tests; end-to-end tests are tests/e2e/*.spec.ts, run by Playwright.
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
		exclude: ['tests/e2e/**', 'tests/lint/fixtures/**']
	}
});
