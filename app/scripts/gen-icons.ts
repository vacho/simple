// Renders the PNG icons of the web app manifest from scripts/icon.ts (D9), with Playwright's
// Chromium: npm run icons. The PNGs are committed; run this only when the icon changes.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { iconSvg } from './icon.ts';

const root = path.resolve(import.meta.dirname, '..');
const icons = [
	{ file: 'static/icons/icon-192.png', size: 192, maskable: false },
	{ file: 'static/icons/icon-512.png', size: 512, maskable: false },
	{ file: 'static/icons/maskable-512.png', size: 512, maskable: true }
];

writeFileSync(path.join(root, 'src/lib/assets/favicon.svg'), iconSvg());
const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, maskable } of icons) {
	await page.setViewportSize({ width: size, height: size });
	const svg = iconSvg({ maskable }).replace('<svg ', `<svg width="${size}" height="${size}" `);
	await page.setContent(`<style>*{margin:0}</style>${svg}`);
	await page.screenshot({ path: path.join(root, file), omitBackground: true });
}
await browser.close();
