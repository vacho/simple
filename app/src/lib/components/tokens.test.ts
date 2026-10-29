// Light and dark appearance (D10): every text and control color pair meets WCAG 2.1 AA.
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

// [foreground, background, minimum]: 4.5 for text, 3 for control boundaries and focus.
const pairs: [string, string, number][] = [
	['text', 'bg', 4.5],
	['text', 'surface', 4.5],
	['text-muted', 'bg', 4.5],
	['text-muted', 'surface', 4.5],
	['primary', 'bg', 4.5],
	['primary', 'surface', 4.5],
	['on-primary', 'primary', 4.5],
	['error', 'bg', 4.5],
	['error', 'surface', 4.5],
	['border', 'bg', 3],
	['border', 'surface', 3],
	['focus', 'bg', 3],
	['focus', 'surface', 3]
];

describe.each([
	['light', colors(light)],
	['dark', colors(dark)]
])('Contrast in the %s theme', (_theme, palette) => {
	it.each(pairs)('%s on %s reaches %s:1', (foreground, background, minimum) => {
		expect(palette[foreground], foreground).toBeDefined();
		expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(minimum);
	});
});
