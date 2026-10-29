// The profile page: language and time zone (localization and app-shell specs).
import { type BrowserContext, type Page } from '@playwright/test';
import {
	addMember,
	newDatabasePath,
	prepareDatabase,
	setUpAdmin,
	startApp,
	type App,
	expect,
	open,
	submitAndWait,
	test
} from './app.ts';

async function start() {
	const databasePath = newDatabasePath();
	const tokens = await prepareDatabase(databasePath, async (db) => ({
		admin: (await setUpAdmin(db)).token,
		member: await addMember(db)
	}));
	const app = startApp(databasePath);
	await app.listening;
	return { app, tokens };
}

const signInWith = (context: BrowserContext, app: App, token: string) =>
	context.addCookies([{ name: 'session', value: token, url: app.url }]);

async function save(page: Page, language?: string, zone?: string) {
	if (language) await page.getByLabel(/^(Language|Idioma)$/).selectOption({ label: language });
	if (zone) await page.getByLabel(/^(Time zone|Zona horaria)$/).selectOption(zone);
	await submitAndWait(page, page.getByRole('button', { name: /^(Save|Guardar)$/ }));
}

test.describe('with an English browser', () => {
	test.use({ locale: 'en-US' });

	test('Choose a language in the profile: Español switches the app now and on later sign-ins', async ({
		page,
		context,
		browser
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/profile`);
		await save(page, 'Español');
		await expect(page.locator('h1')).toHaveText('Perfil');
		await expect(page.locator('html')).toHaveAttribute('lang', 'es');

		// Another device with an English browser: Spanish after signing in.
		const other = await browser.newContext({ locale: 'en-US' });
		const second = await other.newPage();
		await open(second, `${app.url}/login`);
		await expect(second.locator('h1')).toHaveText('Sign in');
		await second.getByLabel('Username').fill('ana');
		await second.getByLabel('Password').fill('correct horse battery');
		await submitAndWait(second, second.getByRole('button', { name: 'Sign in' }));
		await expect(second.locator('h1')).toHaveText('Inicio');
		await other.close();
	});

	test('Return to browser default: the app follows the browser again', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/profile`);
		await save(page, 'Español');
		await save(page, 'Idioma del navegador');
		await expect(page.locator('h1')).toHaveText('Profile');
	});

	test('Change time zone: applies on another device; UTC can be selected', async ({
		page,
		context,
		browser
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/profile`);
		await save(page, undefined, 'Europe/Madrid');
		const other = await browser.newContext();
		await signInWith(other, app, tokens.admin);
		const second = await other.newPage();
		await open(second, `${app.url}/profile`);
		await expect(second.getByLabel('Time zone')).toHaveValue('Europe/Madrid');
		await other.close();

		await save(page, undefined, 'UTC');
		await expect(page.getByLabel('Time zone')).toHaveValue('UTC');
	});

	for (const [scenario, value] of [
		['Invalid zone on the profile page', 'Nowhere/City'],
		['Numeric offsets are not time zones', '+02:00']
	]) {
		test(`${scenario}: rejected with an error, keeping the previous zone`, async ({
			page,
			context
		}) => {
			const { app, tokens } = await start();
			await signInWith(context, app, tokens.admin);
			await open(page, `${app.url}/profile`);
			await save(page, undefined, 'America/La_Paz');
			// A value the selector doesn't offer, as a crafted request would send it.
			await page.getByLabel('Time zone').evaluate((select: HTMLSelectElement, zone) => {
				select.add(new Option(zone, zone, true, true));
			}, value);
			await submitAndWait(page, page.getByRole('button', { name: 'Save' }));
			await expect(page.getByText('Choose a valid time zone.')).toBeVisible();
			await open(page, `${app.url}/profile`);
			await expect(page.getByLabel('Time zone')).toHaveValue('America/La_Paz');
		});
	}

	test('Profile is always reachable: a member opens their own profile', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.member);
		await open(page, `${app.url}/profile`);
		await expect(page.locator('h1')).toHaveText('Profile');
		await expect(page.getByLabel('Language')).toHaveValue('');
	});

	test('No selector outside the profile', async ({ page, context }) => {
		const { app, tokens } = await start();
		for (const path of ['/login']) {
			await open(page, `${app.url}${path}`);
			await expect(page.locator('select')).toHaveCount(0);
		}
		await signInWith(context, app, tokens.admin);
		for (const path of ['/', '/settings']) {
			await open(page, `${app.url}${path}`);
			await expect(page.locator('select')).toHaveCount(0);
		}
		const empty = startApp(newDatabasePath());
		await empty.listening;
		await open(page, `${empty.url}/setup`);
		await expect(page.locator('select')).toHaveCount(0);
	});
});
