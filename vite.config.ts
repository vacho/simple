import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
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
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
		exclude: ['tests/e2e/**', 'tests/lint/fixtures/**']
	}
});
