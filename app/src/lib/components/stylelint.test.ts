import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';
import config from '../../../stylelint.config.js';

const lint = async (code: string) => (await stylelint.lint({ code, config })).results[0].warnings;

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
