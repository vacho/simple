import { type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { startSetUpApp, expect, test } from './app.ts';

// Hydrates with the dictionary fetched from its content-hashed URL, and reports page errors.
async function openHome(page: Page, url: string, locale: string) {
	const errors: Error[] = [];
	page.on('pageerror', (error) => errors.push(error));
	const dictionary = page.waitForResponse(new RegExp(`/i18n/${locale}\\.[0-9a-f]+\\.json$`));
	await page.goto(url);
	expect((await dictionary).ok()).toBe(true);
	await page.waitForLoadState('networkidle');
	return errors;
}

const home = async (url: string, cookie: string, acceptLanguage: string) =>
	(await fetch(`${url}/`, { headers: { cookie, 'accept-language': acceptLanguage } })).text();

for (const [browser, locale, title] of [
	['en-US', 'en', 'Home'],
	['es-BO', 'es', 'Inicio']
] as const) {
	test.describe(`${browser} browser`, () => {
		test.use({ locale: browser, extraHTTPHeaders: { 'accept-language': browser } });

		test(`renders the home page in ${locale}, on the server and after hydration`, async ({
			page,
			context
		}) => {
			const { app, admin } = await startSetUpApp();
			const html = await home(app.url, `session=${admin.token}`, browser);
			expect(html).toContain(`<h1>${title}</h1>`);
			expect(html).toContain(`<html lang="${locale}" dir="ltr">`);
			await context.addCookies([{ name: 'session', value: admin.token, url: app.url }]);
			expect(await openHome(page, app.url, locale)).toEqual([]);
			await expect(page.locator('h1')).toHaveText(title);
			await app.stop();
		});
	});
}

test('Browser language not installed: a French-only browser gets English', async () => {
	const { app, cookie } = await startSetUpApp();
	const html = await home(app.url, cookie, 'fr');
	expect(html).toContain('<html lang="en" dir="ltr">');
	expect(html).toContain('<h1>Home</h1>');
	await app.stop();
});

test('Page language: a page shown in Spanish declares Spanish', async () => {
	const { app, cookie } = await startSetUpApp();
	expect(await home(app.url, cookie, 'es-BO')).toContain('<html lang="es" dir="ltr">');
});

test('Quality values are respected', async () => {
	const { app, cookie } = await startSetUpApp();
	expect(await home(app.url, cookie, 'en;q=0.5, es;q=1')).toContain('<html lang="es"');
	await app.stop();
});

test('the browser bundle does not contain the ICU message parser', () => {
	const client = path.resolve(import.meta.dirname, '../../build/client');
	const files = readdirSync(client, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
		.map((entry) => path.join(entry.parentPath, entry.name));
	expect(files.length).toBeGreaterThan(0);
	// An error code that only the full parser contains, not its no-parser build.
	const withParser = files.filter((file) =>
		readFileSync(file, 'utf8').includes('EXPECT_ARGUMENT_CLOSING_BRACE')
	);
	expect(withParser).toEqual([]);
});
