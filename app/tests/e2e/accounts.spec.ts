// Accounts managed by administrators (spec user-auth, spec household; ADR 0026, 0027).
import Database from 'better-sqlite3';
import { type BrowserContext, type Page } from '@playwright/test';
import { v7 } from 'uuid';
import { resolveActor } from '../../src/lib/features/auth/server/index.ts';
import { createMember, createMemberType } from '../../src/lib/features/household/server/index.ts';
import { testCtx } from '../../src/lib/server/core/ctx.ts';
import type { Db } from '../../src/lib/server/db/client.ts';
import {
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

const signInWith = (context: BrowserContext, app: App, token: string) =>
	context.addCookies([{ name: 'session', value: token, url: app.url }]);

function household(db: Db, token: string) {
	const ctx = testCtx(db, { actor: resolveActor(testCtx(db), token).actor });
	const adult = v7();
	createMemberType(ctx, { id: adult, name: 'Adulto', baseClass: 'adult' });
	createMember(ctx, { id: v7(), name: 'Osvaldo', memberTypeId: adult });
	createMember(ctx, { id: v7(), name: 'Lucía', memberTypeId: adult });
}

async function start() {
	const databasePath = newDatabasePath();
	const admin = await prepareDatabase(databasePath, async (db) => {
		const admin = await setUpAdmin(db);
		household(db, admin.token);
		return admin;
	});
	const app = startApp(databasePath);
	await app.listening;
	return { app, admin };
}

async function openMember(page: Page, app: App, name: string) {
	await open(page, `${app.url}/members`);
	await page.getByRole('link', { name }).click();
	await expect(page.locator('h1')).toHaveText(`Member ${name}`);
}

/** Signs in through the sign-in page in a fresh context. */
async function signInElsewhere(app: App, browserContext: BrowserContext, password: string) {
	const page = await browserContext.newPage();
	await open(page, `${app.url}/login`);
	await page.getByLabel('Username').fill('lucia');
	await page.getByLabel('Password').fill(password);
	await submitAndWait(page, page.getByRole('button', { name: 'Sign in' }));
	return page;
}

/** The password change pages arrive with their own tasks: here the user has already chosen one. */
function passwordChosen(app: App) {
	const db = new Database(app.databasePath);
	db.prepare("UPDATE users SET password_temporary = 0 WHERE username = 'lucia'").run();
	db.close();
}

test('Link the setup administrator to a member, Create an account for a member and Display name suggested from the member: then that user signs in as a member', async ({
	page,
	context,
	browser
}) => {
	const { app, admin } = await start();
	await signInWith(context, app, admin.token);

	await openMember(page, app, 'Osvaldo');
	await page.getByLabel('Account', { exact: true }).selectOption({ label: 'ana (Ana Pérez)' });
	await submitAndWait(page, page.getByRole('button', { name: 'Link account' }));
	await expect(page.getByText('Username: ana')).toBeVisible();
	await expect(page.getByText('This is your account.')).toBeVisible();

	await openMember(page, app, 'Lucía');
	await expect(page.getByLabel('Display name')).toHaveValue('Lucía');
	await page.getByLabel('Username').fill('lucia');
	await page.getByLabel('Temporary password').fill('primer-dia-2026');
	await submitAndWait(page, page.getByRole('button', { name: 'Create account' }));
	await expect(page.getByText('Username: lucia')).toBeVisible();
	await open(page, `${app.url}/members`);
	await expect(page.getByRole('listitem').filter({ hasText: 'Lucía' })).toContainText(
		'Account: lucia'
	);

	passwordChosen(app);
	const other = await browser.newContext({ locale: 'en-US' });
	const lucia = await signInElsewhere(app, other, 'primer-dia-2026');
	await lucia.getByRole('link', { name: 'Members' }).click();
	await expect(lucia.getByRole('listitem').filter({ hasText: 'Osvaldo' })).toBeVisible();
	await expect(lucia.locator('main')).not.toContainText('Account');
	await other.close();
});

test('Deactivate an account, Reactivate an account, and Promote a member to administrator: effective at the next request', async ({
	page,
	context,
	browser
}) => {
	const { app, admin } = await start();
	await signInWith(context, app, admin.token);
	await openMember(page, app, 'Lucía');
	await page.getByLabel('Username').fill('lucia');
	await page.getByLabel('Temporary password').fill('primer-dia-2026');
	await submitAndWait(page, page.getByRole('button', { name: 'Create account' }));
	passwordChosen(app);

	const other = await browser.newContext({ locale: 'en-US' });
	const lucia = await signInElsewhere(app, other, 'primer-dia-2026');
	await expect(lucia.getByRole('link', { name: 'Settings' })).toHaveCount(0);

	// Promote: settings open at her next request.
	await page.getByLabel('Role').selectOption('admin');
	await submitAndWait(page, page.getByRole('button', { name: 'Change role' }));
	await lucia.reload();
	await expect(lucia.getByRole('link', { name: 'Settings' })).toBeVisible();

	// Deactivate after confirming: her next request is signed out.
	// The confirmation step is an in-app navigation, not a page load.
	await page.getByRole('button', { name: 'Deactivate' }).click();
	await expect(page.getByText('Deactivate lucia?')).toBeVisible();
	await submitAndWait(page, page.getByRole('button', { name: 'Deactivate' }).first());
	await expect(page.getByText('Deactivated')).toBeVisible();
	await lucia.reload();
	await expect(lucia).toHaveURL(/\/login/);

	await submitAndWait(page, page.getByRole('button', { name: 'Reactivate' }));
	await expect(page.getByText('Active', { exact: false }).first()).toBeVisible();
	await other.close();
	const again = await browser.newContext({ locale: 'en-US' });
	const back = await signInElsewhere(app, again, 'primer-dia-2026');
	await expect(back.locator('h1')).toHaveText('Home');
	await again.close();
});

test('Reset a forgotten password from the accounts page: confirmed, and the own account has no actions', async ({
	page,
	context
}) => {
	const { app, admin } = await start();
	await signInWith(context, app, admin.token);
	await openMember(page, app, 'Lucía');
	await page.getByLabel('Username').fill('lucia');
	await page.getByLabel('Temporary password').fill('primer-dia-2026');
	await submitAndWait(page, page.getByRole('button', { name: 'Create account' }));

	await open(page, `${app.url}/settings`);
	await page.getByRole('link', { name: 'Accounts' }).click();
	const ana = page.getByRole('listitem').filter({ hasText: 'Username: ana' });
	await expect(ana).toContainText('This is your account.');
	await expect(ana.getByRole('button')).toHaveCount(0);

	const lucia = page.getByRole('listitem').filter({ hasText: 'Username: lucia' });
	await expect(lucia).toContainText('Waiting for a new password');
	await lucia.getByRole('button', { name: 'Reset password' }).click();
	await expect(page.getByText('Set a new temporary password for lucia?')).toBeVisible();
	await page.getByLabel('Temporary password').fill('short');
	await submitAndWait(page, page.getByRole('button', { name: 'Reset password' }).first());
	await expect(page).not.toHaveURL(/password=/);
	await expect(page.getByText(/8 and 128|8 to 128/)).toBeVisible();
});
