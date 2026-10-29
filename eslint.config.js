import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import boundaries, {
	frameworkFree,
	icuParser,
	languagesServer,
	sveltekitModules
} from './eslint.boundaries.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

// Kit 2 modules removed in SvelteKit 3, and legacy Svelte APIs replaced by runes (design D1, D2).
const restrictedImports = {
	paths: [
		{ name: '$app/stores', message: 'Removed in SvelteKit 3: use `page` from $app/state.' },
		{ name: '$lib', message: 'Removed in SvelteKit 3: use #lib/... subpath imports.' },
		{
			name: '$service-worker',
			message: 'Removed in SvelteKit 3: use $app/service-worker and $app/manifest.'
		},
		{ name: 'svelte/store', message: 'Runes only: use $state, $derived and classes.' },
		{
			name: 'svelte',
			importNames: ['createEventDispatcher'],
			message: 'Runes only: pass callback props instead.'
		}
	],
	patterns: [
		{
			group: ['$env/*'],
			message: 'Removed in SvelteKit 3: use $app/env/private or $app/env/public.'
		},
		{ group: ['$lib/*'], message: 'Removed in SvelteKit 3: use #lib/... subpath imports.' }
	]
};

// A later no-restricted-imports entry replaces earlier options, so each override lists every set.
const restrict = (...sets) => [
	'error',
	{
		paths: sets.flatMap((set) => set.paths ?? []),
		patterns: sets.flatMap((set) => set.patterns ?? [])
	}
];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			'no-restricted-imports': restrict(restrictedImports, icuParser)
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		},
		// Runes mode itself is forced in vite.config.ts, so svelte-check fails on legacy syntax.
		rules: { 'svelte/valid-compile': 'error' }
	},
	...boundaries,
	{
		files: frameworkFree,
		rules: { 'no-restricted-imports': restrict(restrictedImports, icuParser, sveltekitModules) }
	},
	{
		files: languagesServer,
		rules: { 'no-restricted-imports': restrict(restrictedImports, sveltekitModules) }
	},
	{
		// Boundary fixtures break the rules on purpose; tests/lint/boundaries.test.ts lints them.
		ignores: ['tests/lint/fixtures/']
	}
);
