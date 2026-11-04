import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDesignMd, buildTokens, parseTokens } from './design-tokens.ts';

const css = readFileSync(
	path.resolve(import.meta.dirname, '../src/lib/components/tokens.css'),
	'utf8'
);

describe('design export (ADR 0030)', () => {
	const tokens = parseTokens(css);

	it('reads both themes from tokens.css', () => {
		expect(tokens.light['color-primary']).toBe('#4f46e5');
		expect(tokens.dark['color-primary']).toBe('#a5b4fc');
		expect(tokens.light['space-3']).toBe('1rem');
	});

	it('writes W3C design tokens with the dark value as a mode', () => {
		const out = buildTokens(tokens);
		expect(out.color['color-primary']).toEqual({
			$type: 'color',
			$value: '#4f46e5',
			$extensions: { modes: { light: '#4f46e5', dark: '#a5b4fc' } }
		});
		expect(out.space['space-3']).toEqual({ $type: 'dimension', $value: { value: 16, unit: 'px' } });
		expect(out['font-weight']['weight-strong']).toEqual({ $type: 'fontWeight', $value: 600 });
		expect(out['font-family']['font-body'].$value).toContain('Inter Variable');
		expect(out.color['color-transparent']).toBeUndefined();
	});

	it('exports every color token of tokens.css', () => {
		const colors = Object.keys(tokens.light).filter(
			(name) => name.startsWith('color-') && tokens.light[name] !== 'transparent'
		);
		expect(Object.keys(buildTokens(tokens).color).sort()).toEqual(colors.sort());
	});

	it('summarizes every color role in DESIGN.md with both themes', () => {
		const md = buildDesignMd(tokens, '1.2.3');
		expect(md).toContain('app v1.2.3');
		expect(md).toContain('| `--color-danger` | #b42318 | #ff8a80 |');
		expect(md).toContain('`--space-3` 16px');
		for (const name of Object.keys(tokens.light).filter((n) => n.startsWith('color-'))) {
			if (name === 'color-transparent') continue;
			expect(md, name).toContain(`\`--${name}\``);
		}
	});

	it('refuses a tokens file without a dark theme', () => {
		expect(() => parseTokens(':root { --color-bg: #fff; }')).toThrow('no dark theme');
	});
});
