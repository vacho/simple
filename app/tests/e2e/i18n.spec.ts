import { expect, test, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Hydrates with the dictionary fetched from its content-hashed URL, and reports page errors.
async function openHome(page: Page, locale: string) {
	const errors: Error[] = [];
	page.on('pageerror', (error) => errors.push(error));
	const dictionary = page.waitForResponse(new RegExp(`/i18n/${locale}\\.[0-9a-f]+\\.json$`));
	await page.goto('/');
	expect((await dictionary).ok()).toBe(true);
	await page.waitForLoadState('networkidle');
	return errors;
}

test.describe('English browser', () => {
	test('renders the home page in English, on the server and after hydration', async ({
		page,
		request
	}) => {
		const html = await (await request.get('/', { headers: { 'accept-language': 'en' } })).text();
		expect(html).toContain('<h1>Home</h1>');
		expect(html).toContain('<html lang="en" dir="ltr">');
		expect(await openHome(page, 'en')).toEqual([]);
		await expect(page.locator('h1')).toHaveText('Home');
	});
});

test.describe('Spanish browser', () => {
	test.use({ locale: 'es-BO', extraHTTPHeaders: { 'accept-language': 'es-BO' } });

	test('renders the home page in Spanish, on the server and after hydration', async ({
		page,
		request
	}) => {
		const html = await (await request.get('/')).text();
		expect(html).toContain('<h1>Inicio</h1>');
		expect(html).toContain('<html lang="es" dir="ltr">');
		expect(await openHome(page, 'es')).toEqual([]);
		await expect(page.locator('h1')).toHaveText('Inicio');
	});
});

test('Browser language not installed: a French-only browser gets English', async ({ request }) => {
	const html = await (await request.get('/', { headers: { 'accept-language': 'fr' } })).text();
	expect(html).toContain('<html lang="en" dir="ltr">');
	expect(html).toContain('<h1>Home</h1>');
});

test('Quality values are respected', async ({ request }) => {
	const headers = { 'accept-language': 'en;q=0.5, es;q=1' };
	expect(await (await request.get('/', { headers })).text()).toContain('<html lang="es"');
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
