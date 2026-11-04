import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';
import config from '../../../stylelint.config.js';

const lint = async (code: string, codeFilename = 'src/lib/components/example.css') =>
	(await stylelint.lint({ code, codeFilename, config })).results[0].warnings;

describe('logical CSS only (D10)', () => {
	it.each([
		'a { margin-left: 1px; }',
		'a { padding-right: 1px; }',
		'a { left: 0; }',
		'a { border-top-left-radius: 2px; }',
		'a { text-align: right; }',
		'a { float: left; }'
	])('rejects %s', async (code) => {
		expect(await lint(code)).not.toEqual([]);
	});

	it('accepts logical properties', async () => {
		const code = 'a { margin-inline-start: 1px; inset-inline-end: 0; text-align: start; }';
		expect(await lint(code)).toEqual([]);
	});
});

describe('colors come from tokens.css', () => {
	it.each([
		'a { color: #123456; }',
		'a { color: rgb(1 2 3); }',
		'a { color: hsl(10 20% 30%); }',
		'a { color: oklch(50% 0.2 30); }',
		'a { color: red; }'
	])('rejects %s outside tokens.css', async (code) => {
		expect(await lint(code)).not.toEqual([]);
	});

	it('accepts token references outside tokens.css', async () => {
		expect(await lint('a { color: var(--color-text); }')).toEqual([]);
	});

	it('accepts color definitions in tokens.css', async () => {
		expect(
			await lint(
				':root { --color-text: #123456; --color-bg: rgb(1 2 3); }',
				'src/lib/components/tokens.css'
			)
		).toEqual([]);
	});
});
