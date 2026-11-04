// Reads tokens.css and turns it into the formats design tools read (ADR 0030). Pure functions,
// so scripts/design-tokens.test.ts can check them without touching the file system.

export interface ParsedTokens {
	/** Custom properties of the light theme (the :root block), by name without the dashes. */
	light: Record<string, string>;
	/** The overrides of the dark theme (prefers-color-scheme: dark). */
	dark: Record<string, string>;
}

const declaration = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;

function declarations(block: string): Record<string, string> {
	const found: Record<string, string> = {};
	for (const [, name, value] of block.matchAll(declaration)) {
		found[name] = value.replace(/\s+/g, ' ').trim();
	}
	return found;
}

/** The light :root block and the dark override inside the prefers-color-scheme media query. */
export function parseTokens(css: string): ParsedTokens {
	const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const mediaStart = withoutComments.search(/@media\s*\(prefers-color-scheme:\s*dark\)/);
	if (mediaStart < 0) throw new Error('tokens.css has no dark theme block');
	const light = /:root\s*\{([\s\S]*?)\}/.exec(withoutComments.slice(0, mediaStart));
	const dark = /:root\s*\{([\s\S]*?)\}/.exec(withoutComments.slice(mediaStart));
	if (!light || !dark) throw new Error('tokens.css must define :root in both themes');
	return { light: declarations(light[1]), dark: declarations(dark[1]) };
}

type TokenType = 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'number' | 'shadow';

interface Token {
	$type: TokenType;
	$value: unknown;
	$description?: string;
	$extensions?: Record<string, unknown>;
}

const rem = /^(-?[\d.]+)rem$/;

/** CSS dimension to the W3C format: rem becomes px at the browser default of 16 px. */
function dimension(value: string): { value: number; unit: 'px' } | string {
	const match = rem.exec(value);
	if (match) return { value: Number(match[1]) * 16, unit: 'px' };
	const px = /^(-?[\d.]+)px$/.exec(value);
	return px ? { value: Number(px[1]), unit: 'px' } : value;
}

function typeOf(name: string, value: string): TokenType | undefined {
	if (name.startsWith('color-')) return 'color';
	if (name === 'font-body') return 'fontFamily';
	if (name.startsWith('weight-')) return 'fontWeight';
	if (name === 'leading') return 'number';
	if (name.startsWith('shadow-')) return 'shadow';
	if (rem.test(value) || /px$/.test(value)) return 'dimension';
	return undefined;
}

const groups: [prefix: string, group: string][] = [
	['color-', 'color'],
	['text-', 'font-size'],
	['font-', 'font-family'],
	['weight-', 'font-weight'],
	['leading', 'line-height'],
	['space-', 'space'],
	['radius-', 'radius'],
	['shadow-', 'shadow'],
	['nav-', 'layout'],
	['side-nav-', 'layout']
];

function groupOf(name: string): string {
	return groups.find(([prefix]) => name.startsWith(prefix))?.[1] ?? 'other';
}

function valueOf(type: TokenType, value: string): unknown {
	if (type === 'dimension') return dimension(value);
	if (type === 'fontWeight' || type === 'number') return Number(value);
	if (type === 'fontFamily') return value.split(',').map((font) => font.trim().replace(/'/g, ''));
	return value;
}

/**
 * The W3C design tokens format (DTCG), grouped by role. Light values are the tokens' values; a
 * token that differs in the dark theme carries its dark value under $extensions.modes, the way
 * Figma variable importers (Tokens Studio and the like) read modes.
 */
export function buildTokens({ light, dark }: ParsedTokens): Record<string, Record<string, Token>> {
	const out: Record<string, Record<string, Token>> = {};
	for (const [name, value] of Object.entries(light)) {
		const type = typeOf(name, value);
		if (!type || value === 'transparent') continue;
		const token: Token = { $type: type, $value: valueOf(type, value) };
		if (dark[name] !== undefined && dark[name] !== value) {
			token.$extensions = {
				modes: { light: token.$value, dark: valueOf(type, dark[name]) }
			};
		}
		(out[groupOf(name)] ??= {})[name] = token;
	}
	return out;
}

const roles: [title: string, names: string[]][] = [
	['Surfaces', ['color-bg', 'color-surface', 'color-surface-raised']],
	['Text', ['color-text', 'color-text-muted']],
	['Lines and focus', ['color-border', 'color-focus']],
	['Accent', ['color-primary', 'color-on-primary', 'color-primary-soft']],
	[
		'Semantic (state only, always with a text label)',
		[
			'color-success',
			'color-success-soft',
			'color-warning',
			'color-warning-soft',
			'color-danger',
			'color-danger-soft',
			'color-on-danger',
			'color-info',
			'color-info-soft'
		]
	]
];

const px = (value: string) => {
	const d = dimension(value);
	return typeof d === 'string' ? d : `${d.value}px`;
};

/** A system summary for design tools (Google Stitch reads it as DESIGN.md). */
export function buildDesignMd({ light, dark }: ParsedTokens, version: string): string {
	const colorRows = roles.flatMap(([title, names]) => [
		`| **${title}** | | |`,
		...names.map((name) => `| \`--${name}\` | ${light[name]} | ${dark[name] ?? light[name]} |`)
	]);
	const pick = (prefix: string) =>
		Object.entries(light)
			.filter(([name]) => name.startsWith(prefix))
			.map(([name, value]) => `\`--${name}\` ${px(value)}`)
			.join(', ');
	return `# Design system

Generated by \`npm run design:export\` from \`app/src/lib/components/tokens.css\` (app v${version}). Don't edit it: change the tokens and regenerate. The guide behind it is \`docs/design/style-guide.md\`.

A household finance web app, installable, used on phones and desktops by the members of one family. Visual direction "Modern fintech": calm and clear, with money front and center.

## Colors

Use colors by role, never by hue. Light and dark themes follow the device.

| Token | Light | Dark |
|---|---|---|
${colorRows.join('\n')}

## Typography

- Family: Inter (variable), self-hosted; fallback ${light['font-body'].split(',').slice(1).join(',').trim()}.
- Sizes: ${pick('text-')}.
- Weights: regular ${light['weight-regular']}, strong ${light['weight-strong']}. Line height ${light.leading}.
- Numbers and money use tabular figures. Income and expense differ by sign and icon as well as color.

## Shape and space

- Radius: ${pick('radius-')}.
- Elevation: one shadow, \`${light['shadow-raised']}\` in light; dark themes use a border instead.
- Space scale: ${pick('space-')}.
- Touch targets at least 44px. Bottom navigation ${px(light['nav-size'])} high on phones; side navigation ${px(light['side-nav-size'])} wide on desktop.

## Components

Page header (title, subtitle, one primary action), card, data list with rows, empty state (says what to do), button (primary, secondary, ghost, danger; small and medium), icon button, badge (neutral, success, warning, danger, info, muted; always with text), field (label, hint, error under the field), password input with show and hide, select, menu, dialog and confirmation dialog, toast for saved changes, tooltip. Icons: Lucide, line style, one weight.

## Patterns

- One primary action per screen, in the page header.
- Content in cards and lists; muted rows for archived items.
- Destructive actions confirmed in a dialog that names the item and the consequence; a danger zone at the bottom of detail pages.
- Every saved change confirmed with a short message; errors next to their field.
- Phone (390px) and desktop (1280px) layouts; no sideways scrolling; logical layout, ready for right-to-left.

## Content

Short, plain, friendly texts in sentence case; buttons say what they do. Texts may grow 40% in other languages. Use made-up names and amounts only.
`;
}
