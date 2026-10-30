// The password change pages (spec user-auth): the forced change and the profile form.
import AxeBuilder from '@axe-core/playwright';
import { type BrowserContext, type Page } from '@playwright/test';
import {
	addMember,
	memberPassword,
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

test.use({ locale: 'en-US' });

async function start(passwordTemporary: boolean) {
	const databasePath = newDatabasePath();
	await prepareDatabase(databasePath, async (db) => {
		await setUpAdmin(db);
		await addMember(db, 'lucia', { passwordTemporary });
	});
	const app = startApp(databasePath);
	await app.listening;
	return app;
}

async function signIn(page: Page, app: App, password: string, path = '/login') {
	await open(page, `${app.url}${path}`);
	await page.getByLabel('Username').fill('lucia');
	await page.locator('input[name="password"]').fill(password);
	await submitAndWait(page, page.getByRole('button', { name: 'Sign in' }));
}

test('First sign-in asks for a new password, then New password equal to the temporary one is refused, and Choosing the new password leads to the requested page', async ({
	page
}) => {
	const app = await start(true);
	await signIn(page, app, memberPassword, '/login?redirectTo=%2Fmembers');
	await expect(page).toHaveURL(`${app.url}/password?redirectTo=%2Fmembers`);
	await expect(page.locator('h1')).toHaveText('Choose your password');
	await expect(page.getByRole('navigation')).toHaveCount(0);

	await page.locator('input[name="password"]').fill(memberPassword);
	await page.locator('input[name="confirm"]').fill(memberPassword);
	await submitAndWait(page, page.getByRole('button', { name: 'Save password' }));
	await expect(page.getByText('Choose a password different from the temporary one.')).toBeVisible();

	await page.locator('input[name="password"]').fill('mi-clave-propia');
	await page.locator('input[name="confirm"]').fill('mi-clave-propia');
	await submitAndWait(page, page.getByRole('button', { name: 'Save password' }));
	await expect(page).toHaveURL(`${app.url}/members`);
	await expect(page.locator('h1')).toHaveText('Members');
});

test('Change own password from the profile: the other device is signed out, this one stays', async ({
	page,
	browser
}) => {
	const app = await start(false);
	const other: BrowserContext = await browser.newContext({ locale: 'en-US' });
	const phone = await other.newPage();
	await signIn(phone, app, memberPassword);
	await signIn(page, app, memberPassword);

	await open(page, `${app.url}/profile`);
	await page.locator('input[name="current"]').fill('not my password');
	await page.locator('input[name="password"]').fill('otra-clave-larga');
	await page.locator('input[name="confirm"]').fill('otra-clave-larga');
	await page.getByRole('button', { name: 'Save password' }).click();
	await expect(page.getByText('The current password is wrong.')).toBeVisible();

	await page.locator('input[name="current"]').fill(memberPassword);
	await page.locator('input[name="password"]').fill('otra-clave-larga');
	await page.locator('input[name="confirm"]').fill('otra-clave-larga');
	await page.getByRole('button', { name: 'Save password' }).click();
	await expect(
		page.locator('[data-scope="toast"][data-part="group"][role="status"]')
	).toContainText('Password changed.');

	await page.reload();
	await expect(page.locator('h1')).toHaveText('Profile');
	await phone.reload();
	await expect(phone).toHaveURL(/\/login/);
	await other.close();
});

test('no serious accessibility violations on the password page', async ({ page }) => {
	const app = await start(true);
	await signIn(page, app, memberPassword);
	await expect(page).toHaveURL(`${app.url}/password`);
	const { violations } = await new AxeBuilder({ page }).analyze();
	expect(
		violations
			.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
			.map((violation) => violation.id)
	).toEqual([]);
});
