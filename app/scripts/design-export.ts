// npm run design:export (ADR 0030): the design system, generated from tokens.css, in the formats
// design tools read: tokens.json (W3C design tokens format, light and dark modes, for Figma
// variables) and DESIGN.md (a system summary, for Google Stitch or as instructions to any tool).
// Writes to design-export/ (not committed: regenerate it whenever tokens.css changes).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildDesignMd, buildTokens, parseTokens } from './design-tokens.ts';

const appRoot = path.resolve(import.meta.dirname, '..');
const css = readFileSync(path.join(appRoot, 'src/lib/components/tokens.css'), 'utf8');
const { version } = JSON.parse(readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const out = path.join(appRoot, 'design-export');

const tokens = parseTokens(css);
mkdirSync(out, { recursive: true });
writeFileSync(
	path.join(out, 'tokens.json'),
	JSON.stringify(buildTokens(tokens), null, '\t') + '\n'
);
writeFileSync(path.join(out, 'DESIGN.md'), buildDesignMd(tokens, version));
console.log(`design-export/tokens.json and design-export/DESIGN.md written (v${version})`);
