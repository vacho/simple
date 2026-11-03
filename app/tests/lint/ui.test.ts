import { ESLint } from 'eslint';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const fixtures = path.join(import.meta.dirname, 'fixtures');
const eslint = new ESLint({
	cwd: fixtures,
	overrideConfigFile: path.join(root, 'eslint.config.js'),
	overrideConfig: {
		settings: { 'boundaries/root-path': fixtures },
		// Fixtures intentionally live outside the application's TypeScript project.
		languageOptions: { parserOptions: { projectService: false } }
	}
});

async function lint(file: string) {
	const [result] = await eslint.lintFiles([path.join(fixtures, file)]);
	expect(result.fatalErrorCount).toBe(0);
	return result.messages.map((message) => message.ruleId);
}

beforeAll(async () => {
	await lint('src/routes/allowed/+page.ts');
}, 60_000);

describe('route UI boundaries (ADR 0028)', () => {
	it.each(['ark', 'ark-subpath', 'lucide', 'lucide-subpath'])(
		'rejects %s imports',
		async (name) => {
			expect(await lint(`src/routes/forbidden-${name}/+page.ts`)).toContain(
				'no-restricted-imports'
			);
			expect(await lint('src/routes/allowed/+page.ts')).toEqual([]);
		}
	);
	it.each(['dialog', 'select', 'details', 'summary'])('rejects raw %s elements', async (name) => {
		expect(await lint(`src/routes/forbidden-${name}/+page.svelte`)).toContain(
			'svelte/no-restricted-html-elements'
		);
		expect(await lint('src/routes/allowed-ui/+page.svelte')).toEqual([]);
	});
});
