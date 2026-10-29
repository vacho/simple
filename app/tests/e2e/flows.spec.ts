// Setup, sign-in and sign-out in a real browser, against the production build.
import { expect, test, type Page } from '@playwright/test';
import Database from 'better-sqlite3';
import {
	addMember,
	newDatabasePath,
	prepareDatabase,
	setUpAdmin,
	startApp,
	startSetUpApp,
	type App
} from './app.ts';

const zoneOf = (app: App, username: string) => {
	const db = new Database(app.databasePath, { readonly: true });
	const zone = db.prepare('SELECT time_zone FROM users WHERE username = ?').pluck().get(username);
	db.close();
	return zone;
};

async function signIn(page: Page, username: string, password: string) {
	await page.getByLabel(/Username|Nombre de usuario/).fill(username);
	await page.getByLabel(/Password|Contraseña/).fill(password);
	await page.getByRole('button', { name: /Sign in|Entrar/ }).click();
}

test.describe('First-run administrator setup', () => {
	test.use({ timezoneId: 'America/La_Paz' });

	test('Setup creates the administrator, with the browser time zone, and shows the app home', async ({
		page
	}) => {
		const app = startApp(newDatabasePath());
		await app.listening;
		await page.goto(`${app.url}/`);
		await expect(page).toHaveURL(`${app.url}/setup`);
		await expect(page.locator('h1')).toHaveText('Set up the app');
		await page.getByLabel('Display name').fill('  María José Ñuflo ');
		await page.getByLabel('Username').fill(' Ana.Perez ');
		await page.getByLabel('Password').fill('correct horse battery');
		await page.getByRole('button', { name: 'Create account' }).click();
		await expect(page).toHaveURL(`${app.url}/`);
		await expect(page.locator('h1')).toHaveText('Home');
		expect(zoneOf(app, 'ana.perez')).toBe('America/La_Paz');
	});

	test('shows why the setup details are invalid', async ({ page }) => {
		const app = startApp(newDatabasePath());
		await app.listening;
		await page.goto(`${app.url}/setup`);
		await page.getByLabel('Display name').fill('Toño');
		await page.getByLabel('Username').fill('toño');
		await page.getByLabel('Password').fill('short');
		await page.getByRole('button', { name: 'Create account' }).click();
		await expect(page.getByText('Use 3 to 32 characters: lowercase letters')).toBeVisible();
		await expect(page.getByLabel('Display name')).toHaveValue('Toño');
	});

	test('Setup is closed once a user exists: the page leads to sign-in', async ({ page }) => {
		const { app } = await startSetUpApp();
		await page.goto(`${app.url}/setup`);
		await expect(page).toHaveURL(`${app.url}/login`);
	});
});

test.describe('First use with a Spanish browser', () => {
	test.use({ locale: 'es-BO', extraHTTPHeaders: { 'x-forwarded-proto': 'http' } });

	test('the setup page is shown in Spanish', async ({ page }) => {
		const app = startApp(newDatabasePath());
		await app.listening;
		await page.goto(`${app.url}/setup`);
		await expect(page.locator('h1')).toHaveText('Configura la aplicación');
		await expect(page.getByLabel('Nombre visible')).toBeVisible();
		await expect(page).toHaveTitle('Configura la aplicación');
	});
});

test.describe('Sign-in', () => {
	test('Successful sign-in returns to the page the user requested', async ({ page }) => {
		const { app } = await startSetUpApp();
		await page.goto(`${app.url}/settings`);
		await expect(page).toHaveURL(`${app.url}/login?redirectTo=%2Fsettings`);
		await signIn(page, 'ana', 'correct horse battery');
		await expect(page).toHaveURL(`${app.url}/settings`);
		await expect(page.locator('h1')).toHaveText('Settings');
	});

	test('Wrong credentials: the same message for a wrong password and an unknown user', async ({
		page
	}) => {
		const { app } = await startSetUpApp();
		for (const [username, password] of [
			['ana', 'wrong password'],
			['nobody', 'wrong password']
		]) {
			await page.goto(`${app.url}/login`);
			await signIn(page, username, password);
			await expect(page.getByRole('alert')).toHaveText('Invalid username or password.');
			await expect(page).toHaveURL(`${app.url}/login`);
		}
	});

	test('Too many failures: locked after 5, even with the correct password', async ({ page }) => {
		const { app } = await startSetUpApp();
		await page.goto(`${app.url}/login`);
		for (let i = 0; i < 5; i++) await signIn(page, 'ana', 'wrong password');
		await signIn(page, 'ana', 'correct horse battery');
		await expect(page.getByRole('alert')).toHaveText('Too many attempts. Try again in 15 minutes.');
	});
});

test.describe('Before sign-in the browser decides', () => {
	test.use({ locale: 'en-US' });

	test('a user with saved Spanish signs in on an English page, then sees the app in Spanish', async ({
		page
	}) => {
		const { app } = await startSetUpApp({ locale: 'es' });
		await page.goto(`${app.url}/login`);
		await expect(page.locator('h1')).toHaveText('Sign in');
		await signIn(page, 'ana', 'correct horse battery');
		await expect(page.locator('h1')).toHaveText('Inicio');
		await expect(page.locator('html')).toHaveAttribute('lang', 'es');
	});
});

test('Sign-out: the session ends and the old cookie no longer grants access', async ({
	page,
	context
}) => {
	const databasePath = newDatabasePath();
	const token = await prepareDatabase(databasePath, async (db) => {
		await setUpAdmin(db);
		return addMember(db);
	});
	const app = startApp(databasePath);
	await app.listening;
	await context.addCookies([{ name: 'session', value: token, url: app.url }]);
	await page.goto(`${app.url}/`);
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(`${app.url}/login`);
	expect(
		(await context.cookies(app.url)).find((cookie) => cookie.name === 'session')
	).toBeUndefined();
	const reused = await fetch(`${app.url}/`, {
		headers: { cookie: `session=${token}`, accept: 'text/html' },
		redirect: 'manual'
	});
	expect([reused.status, reused.headers.get('location')]).toEqual([303, '/login']);
});
