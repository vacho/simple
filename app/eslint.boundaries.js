// Feature boundaries from ADR 0008 (design D16): who may import whom.
// Elements are folders; file categories single out the files with rules of their own.
// Policies are evaluated in order and the last matching one decides.
import boundaries from 'eslint-plugin-boundaries';

const el = (type) => ({ element: { type } });
const sameFeature = (type) => ({
	element: { type, captured: { feature: '{{from.element.captured.feature}}' } }
});
const featureFile = (category) => ({
	element: { type: 'feature-server' },
	file: { categories: category }
});
const anyIndex = featureFile('index');
const anySchema = { file: { categories: 'schema' } };
const anything = { element: { type: '*' } };
const systemActor = {
	to: { file: { categories: 'actor' } },
	dependency: { specifiers: 'systemActor' }
};

const elements = [
	// Order matters: the most specific folder first.
	{ type: 'feature-server', pattern: 'src/lib/features/*/server', capture: ['feature'] },
	{ type: 'feature', pattern: 'src/lib/features/*', capture: ['feature'] },
	{ type: 'core', pattern: 'src/lib/server/core' },
	{ type: 'web', pattern: 'src/lib/server/web' },
	{ type: 'db', pattern: 'src/lib/server/db' },
	{ type: 'policy', pattern: 'src/lib/server/policy' },
	{ type: 'server-root', pattern: 'src/lib/server' },
	{ type: 'domain', pattern: 'src/lib/domain' },
	{ type: 'validation', pattern: 'src/lib/validation' },
	{ type: 'i18n', pattern: 'src/lib/i18n' },
	{ type: 'components', pattern: 'src/lib/components' },
	{ type: 'assets', pattern: 'src/lib/assets' },
	{ type: 'routes', pattern: 'src/routes' },
	{ type: 'src-root', pattern: 'src' },
	{ type: 'scripts', pattern: 'scripts' },
	{ type: 'messages', pattern: 'messages' },
	{ type: 'tests', pattern: 'tests' }
].map((element) => ({ ...element, partialMatch: false }));

const files = [
	{ category: 'test', pattern: ['**/*.test.ts', '**/*.spec.ts', 'tests/**'] },
	{ category: 'index', pattern: 'src/lib/features/*/server/index.ts' },
	{ category: 'schema', pattern: 'src/lib/features/*/server/schema.ts' },
	{ category: 'repo', pattern: 'src/lib/features/*/server/repo.ts' },
	{ category: 'queries', pattern: 'src/lib/features/*/server/queries.ts' },
	{ category: 'actor', pattern: 'src/lib/server/core/actor.ts' },
	{ category: 'startup', pattern: 'src/lib/server/startup.ts' },
	// hooks.server.ts and the service worker are element types of their own in D16.
	{ category: 'hooks', pattern: 'src/hooks.server.ts' },
	{ category: 'service-worker', pattern: 'src/service-worker/**' }
];

const policies = [
	// Routes: thin adapters.
	{
		from: el('routes'),
		allow: {
			to: [
				anyIndex,
				el('feature'),
				el('web'),
				el('components'),
				el('i18n'),
				el('domain'),
				el('validation'),
				el('assets'),
				el('routes')
			]
		}
	},
	{ from: el('routes'), allow: { to: el('policy'), dependency: { specifiers: 'can' } } },
	{ from: el('routes'), disallow: { to: el('policy'), dependency: { specifiers: '!can' } } },

	// hooks.server.ts is the only importer of startup.ts.
	{
		from: { ...el('src-root'), file: { categories: 'hooks' } },
		allow: {
			to: [
				{ ...el('server-root'), file: { categories: 'startup' } },
				el('web'),
				anyIndex,
				el('i18n')
			]
		}
	},
	{
		from: { ...el('src-root'), file: { categories: 'service-worker' } },
		allow: { to: el('i18n') }
	},

	// Feature server code (service.ts, index.ts, helpers): its own feature, other features'
	// public API and client-safe files, and the shared layers.
	{
		from: el('feature-server'),
		allow: {
			to: [
				sameFeature('feature-server'),
				sameFeature('feature'),
				anyIndex,
				el('feature'),
				el('core'),
				el('policy'),
				el('domain')
			]
		}
	},
	// schema.ts: other schema files only, for foreign keys.
	{ from: featureFile('schema'), disallow: { to: anything } },
	{ from: featureFile('schema'), allow: { to: anySchema } },
	// repo.ts: its own tables.
	{ from: featureFile('repo'), disallow: { to: anything } },
	{
		from: featureFile('repo'),
		allow: {
			to: [{ ...sameFeature('feature-server'), ...anySchema }, el('db'), el('core')]
		}
	},
	// queries.ts: read models, the one place that reads other features' tables.
	{ from: featureFile('queries'), disallow: { to: anything } },
	{
		from: featureFile('queries'),
		allow: { to: [el('db'), el('policy'), el('core'), anySchema] }
	},
	// Only the languages feature reads the message catalogs.
	{
		from: { element: { type: 'feature-server', captured: { feature: 'languages' } } },
		allow: { to: el('messages') }
	},

	// Client-safe feature files.
	{
		from: el('feature'),
		allow: { to: [sameFeature('feature'), el('validation'), el('domain'), el('i18n')] }
	},

	// Shared layers.
	{ from: el('domain'), allow: { to: [el('domain'), el('i18n')] } },
	{ from: el('validation'), allow: { to: el('validation') } },
	{ from: el('core'), allow: { to: [el('core'), el('db'), el('validation')] } },
	{ from: el('web'), allow: { to: [el('web'), el('core'), el('db'), el('i18n')] } },
	{ from: el('policy'), allow: { to: [el('policy'), el('core')] } },
	{ from: el('components'), allow: { to: [el('components'), el('i18n'), el('assets')] } },
	{ from: el('i18n'), allow: { to: el('i18n') } },
	{ from: el('db'), allow: { to: [el('db'), anySchema] } },
	{ from: el('server-root'), allow: { to: [el('db'), el('core'), anyIndex] } },
	{ from: el('scripts'), allow: { to: [el('scripts'), el('db'), el('core'), el('i18n')] } },

	// The system actor: auth internals, startup.ts and scripts only.
	{ disallow: systemActor },
	{
		from: [
			{ element: { type: 'feature-server', captured: { feature: 'auth' } } },
			{ file: { categories: 'startup' } },
			el('scripts')
		],
		allow: systemActor
	},

	// Tests may reach whatever they exercise.
	{ from: { file: { categories: 'test' } }, allow: { to: anything } }
];

// Modules that must not appear in framework-free code (D16: only server/web/ imports SvelteKit).
export const sveltekitModules = {
	paths: [
		{ name: '@sveltejs/kit', message: 'Framework-free code: SvelteKit belongs in server/web/.' }
	],
	patterns: [
		{ group: ['$app/*'], message: 'Framework-free code: SvelteKit belongs in server/web/.' }
	]
};

export const icuParser = {
	paths: [
		{
			name: '@formatjs/icu-messageformat-parser',
			message: 'Only the languages feature and scripts/ parse messages (D14).'
		}
	]
};

export const frameworkFree = [
	'src/lib/server/core/**',
	'src/lib/server/policy/**',
	'src/lib/server/db/**',
	'src/lib/features/**',
	'src/lib/domain/**',
	'src/lib/validation/**'
];

export const languagesServer = ['src/lib/features/languages/server/**'];

// Message generation and checks; they read messages/*.json from disk.
export const scripts = ['scripts/**'];

export default [
	{
		files: ['**/*.ts', '**/*.js', '**/*.svelte'],
		plugins: { boundaries },
		settings: {
			'import/resolver': { typescript: { alwaysTryTypes: true } },
			'boundaries/elements': elements,
			'boundaries/files': files
		},
		rules: {
			'boundaries/dependencies': [
				'error',
				{
					default: 'disallow',
					message:
						'{{from.element.types}} may not import {{to.element.types}} {{to.file.categories}} ({{dependency.specifiers}}): see ADR 0008',
					policies
				}
			]
		}
	},
	{
		files: ['src/lib/features/*/server/queries.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'CallExpression[callee.property.name=/^(insert|update|delete)$/]',
					message: 'queries.ts is read-only: writes go through repo.ts (ADR 0008).'
				}
			]
		}
	}
];
