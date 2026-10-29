// Installable app and offline fallback (app-shell spec, D9), against the production build.
import { type BrowserContext, type Page } from '@playwright/test';
import { startSetUpApp, type App, expect, test } from './app.ts';

const controlled = (page: Page) =>
	page.waitForFunction(() => navigator.serviceWorker.controller !== null);
const storedLocale = (page: Page) =>
	page.evaluate(async () => (await (await caches.match('/__meta/locale'))?.text()) ?? null);
const signInWith = (context: BrowserContext, app: App, token: string) =>
	context.addCookies([{ name: 'session', value: token, url: app.url }]);

async function offlineHeading(page: Page, context: BrowserContext) {
	await context.setOffline(true);
	await page.reload();
	return page.locator('h1');
}

test('Installability criteria: the manifest is public and complete, and a service worker controls the page', async ({
	page
}) => {
	const { app } = await startSetUpApp();
	const response = await fetch(`${app.url}/manifest.webmanifest`, { redirect: 'manual' });
	expect(response.status).toBe(200);
	const manifest = await response.json();
	expect(manifest).toMatchObject({
		name: expect.any(String),
		short_name: expect.any(String),
		start_url: '/',
		display: 'standalone',
		theme_color: expect.any(String),
		background_color: expect.any(String)
	});
	const icons = manifest.icons.map(
		(icon: { sizes: string; purpose: string }) => `${icon.sizes} ${icon.purpose}`
	);
	expect(icons).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
	for (const { src } of manifest.icons) expect((await fetch(`${app.url}${src}`)).status).toBe(200);

	await page.goto(`${app.url}/login`);
	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
		'href',
		/manifest\.webmanifest$/
	);
	await controlled(page);
});

test('Installed app opens standalone: at the start URL, without the address bar', async () => {
	// The manifest asks for it; opening from a real installed icon is checked by hand (task 9.5).
	const { app } = await startSetUpApp();
	const manifest = await (await fetch(`${app.url}/manifest.webmanifest`)).json();
	expect([manifest.display, manifest.start_url, manifest.scope]).toEqual(['standalone', '/', '/']);
});

test.describe('with an English browser', () => {
	test.use({ locale: 'en-US' });

	test("Offline page keeps the user's language: Spanish profile, network cut later", async ({
		page,
		context
	}) => {
		const { app, admin } = await startSetUpApp({ locale: 'es' });
		await signInWith(context, app, admin.token);
		await page.goto(`${app.url}/`);
		await controlled(page);
		await page.goto(`${app.url}/profile`);
		await expect.poll(() => storedLocale(page)).toBe('es');
		await expect(await offlineHeading(page, context)).toHaveText('Sin conexión');
		await expect(page.locator('html')).toHaveAttribute('lang', 'es');
	});

	test('Offline right after the first visit: in the language that visit used', async ({
		page,
		context
	}) => {
		const { app, admin } = await startSetUpApp({ locale: 'es' });
		await signInWith(context, app, admin.token);
		await page.goto(`${app.url}/`);
		await controlled(page);
		await expect.poll(() => storedLocale(page)).toBe('es');
		await expect(await offlineHeading(page, context)).toHaveText('Sin conexión');
	});
});

for (const [browser, heading] of [
	['es-BO', 'Sin conexión'],
	['en-US', "You're offline"]
]) {
	test.describe(`a fresh ${browser} device`, () => {
		test.use({ locale: browser });

		test("Offline page without a previous visit: the browser's language, or English", async ({
			page,
			context
		}) => {
			const { app } = await startSetUpApp();
			await page.goto(`${app.url}/login`);
			await controlled(page);
			// No language recorded on this device.
			await expect.poll(() => storedLocale(page)).not.toBeNull();
			await page.evaluate(async () => {
				for (const name of await caches.keys())
					await (await caches.open(name)).delete('/__meta/locale');
			});
			await expect(await offlineHeading(page, context)).toHaveText(heading);
		});
	});
}

test('No private responses in the cache: only app files, the offline page and a language code', async ({
	page,
	context
}) => {
	const { app, admin } = await startSetUpApp();
	await signInWith(context, app, admin.token);
	for (const path of ['/', '/settings', '/profile', '/']) {
		await page.goto(`${app.url}${path}`);
		await controlled(page);
	}
	await expect.poll(() => storedLocale(page)).toBe('en');
	const cached = await page.evaluate(async () => {
		const entries: string[] = [];
		for (const name of await caches.keys()) {
			for (const request of await (await caches.open(name)).keys()) {
				entries.push(new URL(request.url).pathname);
			}
		}
		return entries;
	});
	const allowed = (path: string) =>
		path === '/offline' ||
		path === '/__meta/locale' ||
		path.startsWith('/_app/immutable/') ||
		path.startsWith('/icons/') ||
		['/manifest.webmanifest', '/robots.txt'].includes(path);
	expect(cached.filter((path) => !allowed(path))).toEqual([]);
	expect(cached).toContain('/offline');
	expect(await storedLocale(page)).toMatch(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/);
});
