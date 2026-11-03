// Household name and member types pages (spec household), in English and Spanish.
import { type BrowserContext, type Page } from '@playwright/test';
import { v7 } from 'uuid';
import { createMemberType } from '../../src/lib/features/household/server/index.ts';
import { members } from '../../src/lib/server/db/schema.ts';
import { testCtx } from '../../src/lib/server/core/ctx.ts';
import { resolveActor } from '../../src/lib/features/auth/server/index.ts';
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
	test,
	choose
} from './app.ts';

const signInWith = (context: BrowserContext, app: App, token: string) =>
	context.addCookies([{ name: 'session', value: token, url: app.url }]);

/** Types used by 1 and 3 members, written before the app starts. */
function typesWithMembers(db: Db, token: string) {
	const actor = resolveActor(testCtx(db), token).actor;
	const ctx = testCtx(db, { actor });
	const used = [
		['Hijo', 'minor', 1],
		['Abuela', 'adult', 3]
	] as const;
	for (const [name, baseClass, count] of used) {
		const id = v7();
		createMemberType(ctx, { id, name, baseClass });
		for (let i = 0; i < count; i++) {
			const memberId = v7();
			db.insert(members)
				.values({
					id: memberId,
					name: `${name} ${i}`,
					nameKey: `${name} ${i}`.toLowerCase(),
					memberTypeId: id,
					createdAt: new Date()
				})
				.run();
		}
	}
}

async function start(locale: string | null = null, withTypes = false) {
	const databasePath = newDatabasePath();
	const tokens = await prepareDatabase(databasePath, async (db) => {
		const admin = await setUpAdmin(db, { locale });
		if (withTypes) typesWithMembers(db, admin.token);
		return { admin: admin.token, member: await addMember(db) };
	});
	const app = startApp(databasePath);
	await app.listening;
	return { app, tokens };
}

const row = (page: Page, name: string) =>
	page
		.getByRole('listitem')
		.filter({ has: page.getByRole('textbox', { name: /Name|Nombre/ }) })
		.filter({
			has: page.locator(`input[value="${name}"]`)
		});

test.describe('in English', () => {
	test.use({ locale: 'en-US' });

	test('Dialog with the keyboard: cancel receives focus, Tab stays inside and Escape restores the trigger', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start(null, true);
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/settings/member-types`);
		const trigger = row(page, 'Hijo').getByRole('button', { name: 'Archive', exact: true });
		await trigger.focus();
		await page.keyboard.press('Enter');
		const dialog = page.getByRole('alertdialog');
		const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
		await expect(cancel).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(dialog.getByRole('button', { name: 'Archive', exact: true })).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(cancel).toBeFocused();
		await page.keyboard.press('Shift+Tab');
		await expect(dialog.getByRole('button', { name: 'Archive', exact: true })).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();
		await expect(row(page, 'Hijo')).not.toContainText('Archived');
	});

	test('Administrator names the household, and Unnamed household after setup: the settings page saves the name', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/settings`);
		await page.getByRole('link', { name: 'Household', exact: true }).click();
		await expect(page.locator('h1')).toHaveText('Household');
		await expect(page.getByLabel('Name')).toHaveValue('');
		await page.getByLabel('Name').fill('  Familia Pérez ');
		await page.getByRole('button', { name: 'Save name' }).click();
		await expect(
			page.locator('[data-scope="toast"][data-part="group"][role="status"]')
		).toContainText('Household name saved.');
		await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
			'Familia Pérez'
		);
	});

	test('Invalid household name: explained, and nothing saved', async ({ page, context }) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/settings/household`);
		await page.getByLabel('Name').fill('x'.repeat(65));
		await page.getByRole('button', { name: 'Save name' }).click();
		await expect(page.getByText('Use at most 64 characters.')).toBeVisible();
	});

	test('Create a member type, No member types after setup, and Delete an unused member type: the catalog page', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/settings/member-types`);
		await expect(page.getByText('There are no member types yet.')).toBeVisible();

		await page.getByLabel('Name').fill('Abuela');
		await choose(page, 'Base class', 'Adult');
		await submitAndWait(page, page.getByRole('button', { name: 'Create member type' }));
		await expect(row(page, 'Abuela')).toContainText('0 members');

		// Rename it, then delete it after confirming.
		await row(page, 'Abuela').getByRole('textbox').fill('Abuelita');
		await submitAndWait(page, row(page, 'Abuela').getByRole('button', { name: 'Save' }));
		await expect(row(page, 'Abuelita')).toBeVisible();
		await row(page, 'Abuelita').getByRole('button', { name: 'Delete' }).click();
		const dialog = page.getByRole('alertdialog', { name: 'Delete member type "Abuelita"?' });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toBeHidden();
		await expect(row(page, 'Abuelita')).toBeVisible();
		await row(page, 'Abuelita').getByRole('button', { name: 'Delete' }).click();
		await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
		await expect(page.getByText('There are no member types yet.')).toBeVisible();
	});

	test('Duplicate member type name: explained on the form', async ({ page, context }) => {
		const { app, tokens } = await start(null, true);
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/settings/member-types`);
		const create = page.locator('form[action="?/create"]');
		await create.getByLabel('Name').fill('hijo');
		await submitAndWait(page, page.getByRole('button', { name: 'Create member type' }));
		await expect(create.getByRole('alert')).toHaveText('That name is already in use.');
	});

	test('Member count, Archive a used member type and Unarchive a member type: counts and archiving', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start(null, true);
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/settings/member-types`);
		await expect(row(page, 'Hijo')).toContainText('1 member');
		await expect(row(page, 'Abuela')).toContainText('3 members');
		await expect(row(page, 'Hijo').getByRole('combobox', { name: 'Base class' })).toBeDisabled();
		await expect(row(page, 'Hijo').getByRole('button', { name: 'Delete' })).toHaveCount(0);

		await row(page, 'Hijo').getByRole('button', { name: 'Archive' }).click();
		await page
			.getByRole('alertdialog')
			.getByRole('button', { name: 'Archive', exact: true })
			.click();
		await expect(row(page, 'Hijo')).toContainText('Archived');
		await submitAndWait(page, row(page, 'Hijo').getByRole('button', { name: 'Unarchive' }));
		await expect(row(page, 'Hijo')).not.toContainText('Archived');
	});

	test('a member user is denied the household and member types pages', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start();
		await signInWith(context, app, tokens.member);
		for (const path of ['/settings/household', '/settings/member-types']) {
			const response = await page.goto(`${app.url}${path}`);
			expect(response?.status(), path).toBe(403);
		}
	});
});

test.describe('in Spanish', () => {
	test.use({ locale: 'en-US' });

	test('Member count: "1 miembro" and "3 miembros", base classes translated', async ({
		page,
		context
	}) => {
		const { app, tokens } = await start('es', true);
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/settings/member-types`);
		await expect(page.locator('h1')).toHaveText('Tipos de miembro');
		await expect(row(page, 'Hijo')).toContainText('1 miembro');
		await expect(row(page, 'Abuela')).toContainText('3 miembros');
		await expect(row(page, 'Hijo').locator('select[name="baseClass"]')).toHaveValue('minor');
		await expect(row(page, 'Hijo').locator('option:checked')).toHaveText('Menor');
	});

	test('the household name is saved from the Spanish page', async ({ page, context }) => {
		const { app, tokens } = await start('es');
		await signInWith(context, app, tokens.admin);
		await open(page, `${app.url}/settings/household`);
		await page.getByLabel('Nombre').fill('Familia Pérez');
		await page.getByRole('button', { name: 'Guardar nombre' }).click();
		await expect(page.locator('[data-scope="toast"][data-part="group"]')).toContainText(
			'Nombre del hogar guardado.'
		);
	});
});
