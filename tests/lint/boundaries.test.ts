// Lints the fixture tree with the project's ESLint config, rooted at the fixtures, so the
// ADR 0008 boundaries are checked on one forbidden and one allowed case each (task 1.3).
import { ESLint } from 'eslint';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const fixtures = path.join(import.meta.dirname, 'fixtures');

const eslint = new ESLint({
	cwd: fixtures,
	overrideConfigFile: path.join(root, 'eslint.config.js'),
	overrideConfig: { settings: { 'boundaries/root-path': fixtures } }
});

async function ruleIds(file: string): Promise<string[]> {
	const [result] = await eslint.lintFiles([path.join(fixtures, file)]);
	return result.messages.map((message) => message.ruleId ?? message.message);
}

describe('feature boundaries (ADR 0008)', () => {
	it.each([
		[
			'a route importing server/db/client.ts',
			'src/routes/forbidden-db/+page.server.ts',
			'boundaries/dependencies'
		],
		[
			'users importing auth/server/repo.ts',
			'src/lib/features/users/server/service.ts',
			'boundaries/dependencies'
		],
		[
			"a service.ts importing another feature's schema.ts",
			'src/lib/features/auth/server/service.ts',
			'boundaries/dependencies'
		],
		[
			'an insert in a queries.ts',
			'src/lib/features/users/server/queries.ts',
			'no-restricted-syntax'
		],
		['@sveltejs/kit in server/core/', 'src/lib/server/core/uses-kit.ts', 'no-restricted-imports'],
		[
			'systemActor in a route',
			'src/routes/forbidden-system/+page.server.ts',
			'boundaries/dependencies'
		],
		['systemActor in hooks.server.ts', 'src/hooks.server.ts', 'boundaries/dependencies']
	])('rejects %s', async (_case, file, rule) => {
		expect(await ruleIds(file)).toEqual([rule]);
	});

	it.each([
		['a route using components/ and i18n/', 'src/routes/allowed/+page.ts'],
		[
			'auth/server/schema.ts referencing users/server/schema.ts',
			'src/lib/features/auth/server/schema.ts'
		],
		[
			'a feature with only server/index.ts and server/service.ts',
			'src/lib/features/notes/server/index.ts'
		],
		['the service of that feature', 'src/lib/features/notes/server/service.ts']
	])('allows %s', async (_case, file) => {
		expect(await ruleIds(file)).toEqual([]);
	});
});
