// Light and dark appearance: every component color pair meets WCAG 2.1 AA.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('tokens.css', import.meta.url), 'utf8');
const [light, dark] = css.split('@media (prefers-color-scheme: dark)');

function colors(block: string): Record<string, string> {
	return Object.fromEntries(
		[...block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]])
	);
}

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
	const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (high + 0.05) / (low + 0.05);
};

const surfaces = ['bg', 'surface', 'surface-raised'];
const textColors = ['text', 'text-muted', 'primary', 'success', 'warning', 'danger', 'info'];
const badgeColors = ['primary', 'success', 'warning', 'danger', 'info'];

// [foreground, background, minimum]: text is 4.5:1; control boundaries are 3:1.
const pairs: [string, string, number][] = [
	...textColors.flatMap((foreground): [string, string, number][] =>
		surfaces.map((background) => [foreground, background, 4.5])
	),
	['on-primary', 'primary', 4.5],
	['on-danger', 'danger', 4.5],
	...badgeColors.map((foreground): [string, string, number] => [
		foreground,
		`${foreground}-soft`,
		4.5
	]),
	// Neutral and muted badges use text labels on these neutral backgrounds.
	['text-muted', 'surface', 4.5],
	['text-muted', 'bg', 4.5],
	...['border', 'focus', 'primary', 'danger'].flatMap((foreground): [string, string, number][] =>
		surfaces.map((background) => [foreground, background, 3])
	)
];

describe.each([
	['light', colors(light)],
	['dark', colors(dark)]
])('Contrast, and Badge without color: the %s theme', (_theme, palette) => {
	it.each(pairs)('%s on %s reaches %s:1', (foreground, background, minimum) => {
		expect(palette[foreground], foreground).toBeDefined();
		expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(minimum);
	});
});
