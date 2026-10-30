// The members page and the administrators' member page (spec household).
import AxeBuilder from '@axe-core/playwright';
import { type BrowserContext, type Page } from '@playwright/test';
import { v7 } from 'uuid';
import { resolveActor } from '../../src/lib/features/auth/server/index.ts';
import {
	archiveMemberType,
	createMember,
	createMemberType,
	renameHousehold
} from '../../src/lib/features/household/server/index.ts';
import { testCtx } from '../../src/lib/server/core/ctx.ts';
import type { Db } from '../../src/lib/server/db/client.ts';
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

const signInWith = (context: BrowserContext, app: App, token: string) =>
	context.addCookies([{ name: 'session', value: token, url: app.url }]);

/** A named household with two types and two members, written before the app starts. */
function household(db: Db, token: string) {
	const ctx = testCtx(db, { actor: resolveActor(testCtx(db), token).actor });
	renameHousehold(ctx, { name: 'Familia Pérez' });
	const hija = v7();
	const adulto = v7();
	createMemberType(ctx, { id: hija, name: 'Hija', baseClass: 'minor' });
	createMemberType(ctx, { id: adulto, name: 'Papá', baseClass: 'adult' });
	createMember(ctx, { id: v7(), name: 'Lucía', memberTypeId: hija });
	createMember(ctx, { id: v7(), name: 'Osvaldo', memberTypeId: adulto });
	// A type no member has yet, and an archived one.
	createMemberType(ctx, { id: v7(), name: 'Abuela', baseClass: 'adult' });
	const old = v7();
	createMemberType(ctx, { id: old, name: 'Antiguo', baseClass: 'dependent' });
	archiveMemberType(ctx, old);
}

async function start({ locale = null as string | null, seeded = true } = {}) {
	const databasePath = newDatabasePath();
	const tokens = await prepareDatabase(databasePath, async (db) => {
		const admin = await setUpAdmin(db, { locale });
		if (seeded) household(db, admin.token);
		return { admin: admin.token, member: await addMember(db) };
	});
	const app = startApp(databasePath);
	await app.listening;
	return { app, tokens };
}

const entry = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name });

test.describe('in English', () => {
	test.use({ locale: 'en-US' });

	test('Member views the household, and Account details are hidden from members: read-only members and member types', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.member);
		await open(page, `${app.url}/`);
		await page.getByRole('link', { name: 'Members' }).click();
		await expect(page.locator('h1')).toHaveText('Members');
		await expect(page.getByRole('main').getByText('Familia Pérez')).toBeVisible();
		await expect(entry(page, 'Lucía')).toContainText('Hija (Minor)');
		await expect(entry(page, 'Osvaldo')).toContainText('Papá (Adult)');
		const types = page.getByRole('heading', { name: 'Member types' }).locator('+ ul');
		await expect(types).toContainText('Abuela (Adult)');
		await expect(types).not.toContainText('Antiguo');
		await expect(page.locator('main form')).toHaveCount(0);
		await expect(page.locator('main a')).toHaveCount(0);
		await expect(page.locator('main')).not.toContainText(/Account|No account/);
	});

	test('Unnamed household after setup: the placeholder, and Members need a member type', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start({ seeded: false });
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/members`);
		await expect(page.getByRole('main').getByText('Unnamed household')).toBeVisible();
		await expect(page.getByText('Members need a member type first.')).toBeVisible();
		await page.getByRole('link', { name: 'Create a member type' }).click();
		await expect(page.locator('h1')).toHaveText('Member types');
	});

	test('Create a member, and Administrator views the household: accounts shown to administrators', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/members`);
		await expect(entry(page, 'Lucía')).toContainText('No account');
		await page.getByLabel('Name').fill('Mateo');
		await page.getByLabel('Member type').selectOption({ label: 'Hija (Minor)' });
		await submitAndWait(page, page.getByRole('button', { name: 'Add member' }));
		await expect(entry(page, 'Mateo')).toContainText('Hija (Minor)');

		await page.getByLabel('Name').fill('lucía');
		await submitAndWait(page, page.getByRole('button', { name: 'Add member' }));
		await expect(page.getByRole('alert')).toHaveText('That name is already in use.');
	});

	test('Archive a member, Unarchive a member and Delete a member never linked: the member page', async ({
		page,
		context,
		browser
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/members`);
		await page.getByRole('link', { name: 'Osvaldo' }).click();
		await expect(page.locator('h1')).toHaveText('Member Osvaldo');

		await page.getByLabel('Name', { exact: true }).fill('Osvaldo V.');
		await submitAndWait(page, page.getByRole('button', { name: 'Save changes' }));
		await expect(page.locator('h1')).toHaveText('Member Osvaldo V.');

		await page.getByRole('button', { name: 'Archive', exact: true }).click();
		await page
			.getByRole('alertdialog')
			.getByRole('button', { name: 'Archive', exact: true })
			.click();
		await expect(
			page.getByRole('status').filter({ hasText: 'This member is archived.' })
		).toBeVisible();

		// A member user no longer sees him.
		const other = await browser.newContext({ locale: 'en-US' });
		await signInWith(other, app, tokens.member);
		const memberPage = await other.newPage();
		await open(memberPage, `${app.url}/members`);
		await expect(memberPage.getByText('Osvaldo V.')).toHaveCount(0);

		await page.getByRole('button', { name: 'Unarchive' }).click();
		await expect(page.getByRole('button', { name: 'Archive', exact: true })).toBeVisible();
		await open(memberPage, `${app.url}/members`);
		await expect(memberPage.getByText('Osvaldo V.')).toBeVisible();
		await other.close();

		await page.getByRole('button', { name: 'Delete', exact: true }).click();
		await page
			.getByRole('alertdialog')
			.getByRole('button', { name: 'Delete', exact: true })
			.click();
		await expect(page.locator('h1')).toHaveText('Members');
		await expect(page.getByText('Osvaldo V.')).toHaveCount(0);
	});

	test('a member user is denied the member page', async ({ page, context }) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/members`);
		const href = await page.getByRole('link', { name: 'Lucía' }).getAttribute('href');
		await context.clearCookies();
		await signInWith(context, app, tokens.member);
		expect((await page.goto(`${app.url}${href}`))?.status()).toBe(403);
	});

	test('Visitors cannot see the household: sent to sign in', async ({ page }) => {
		const { app } = await start();
		await page.goto(`${app.url}/members`);
		await expect(page).toHaveURL(`${app.url}/login?redirectTo=%2Fmembers`);
		await expect(page.getByText('Familia Pérez')).toHaveCount(0);
	});

	for (const colorScheme of ['light', 'dark'] as const) {
		test(`no serious accessibility violations on the members pages, ${colorScheme} theme`, async ({
			page,
			context
		}) => {
			await page.emulateMedia({ colorScheme });
			const { app, tokens } = await start();
			await signInWith(context, app, tokens.admin);
			await open(page, `${app.url}/members`);
			const pages = [
				page.url(),
				await page.getByRole('link', { name: 'Lucía' }).getAttribute('href')
			];
			for (const url of pages) {
				await page.goto(url!.startsWith('http') ? url! : `${app.url}${url}`);
				const { violations } = await new AxeBuilder({ page }).analyze();
				const serious = violations.filter(
					(violation) => violation.impact === 'serious' || violation.impact === 'critical'
				);
				expect(
					serious.map((violation) => violation.id),
					url!
				).toEqual([]);
			}
		});
	}
});

test.describe('in Spanish', () => {
	test.use({ locale: 'en-US' });

	test('Base class names in Spanish: "Menor", and the type as entered', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start({ locale: 'es' });
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/members`);
		await expect(page.locator('h1')).toHaveText('Miembros');
		await expect(entry(page, 'Lucía')).toContainText('Hija (Menor)');
		await expect(entry(page, 'Lucía')).toContainText('Sin cuenta');
	});
});
