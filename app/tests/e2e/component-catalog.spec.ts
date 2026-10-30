import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import {
	appRoot,
	expect,
	newDatabasePath,
	prepareDatabase,
	setUpAdmin,
	startSetUpApp,
	test
} from './app.ts';

test('Component catalog is unavailable in the production build', async ({ page, context }) => {
	const { app, admin } = await startSetUpApp();
	await context.addCookies([{ name: 'session', value: admin.token, url: app.url }]);
	const response = await page.goto(`${app.url}/dev/components`);
	expect(response?.status()).toBe(404);
});

test('Development catalog renders in both themes without axe violations and previews RTL', async ({
	page,
	context
}) => {
	const databasePath = newDatabasePath();
	const admin = await prepareDatabase(databasePath, setUpAdmin);
	const port = 5200 + (process.pid % 10000);
	const url = `http://127.0.0.1:${port}`;
	const server = spawn(
		'npm',
		['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
		{
			cwd: appRoot,
			env: { ...process.env, DATABASE_PATH: databasePath, PROTOCOL_HEADER: 'x-forwarded-proto' }
		}
	);
	let output = '';
	server.stdout.on('data', (chunk) => (output += chunk));
	server.stderr.on('data', (chunk) => (output += chunk));
	try {
		await expect.poll(() => output.includes('Local:'), { timeout: 30000 }).toBe(true);
		await context.addCookies([{ name: 'session', value: admin.token, url }]);
		for (const colorScheme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme });
			await page.goto(`${url}/dev/components?dir=rtl`);
			await expect(page.getByRole('heading', { name: 'Component catalog' })).toBeVisible();
			await expect(page.locator('.catalog')).toHaveAttribute('dir', 'rtl');
			const { violations } = await new AxeBuilder({ page }).analyze();
			expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual(
				[]
			);
		}
		const field = page.locator('input[name="sample"]');
		expect(
			await field.evaluate((input: HTMLInputElement) => input.labels?.[0]?.textContent?.trim())
		).toBe('Name');
		const hintId = await field.getAttribute('aria-describedby');
		expect(hintId).toBeTruthy();
		await expect(page.locator(`[id="${hintId}"]`)).toContainText('household');
		const invalid = page.locator('input[name="invalid-sample"]');
		await expect(invalid).toHaveAttribute('aria-invalid', 'true');
		const errorId = await invalid.getAttribute('aria-describedby');
		expect(errorId).toBeTruthy();
		await expect(page.locator(`[id="${errorId}"]`)).toContainText('already');

		const form = page.locator('form[action="?/sample"]');
		await expect(form.locator('select[name="selection"]')).toHaveValue('adult');
		await form.locator('input[name="sample-password"]').fill('catalog test');
		await form.getByRole('button', { name: 'Save name' }).click();
		await expect(page.locator('[data-form-result]')).toContainText('"selection":"adult"');
		await expect(page.locator('[data-form-result]')).toContainText('"passwordLength":12');
		await page.waitForLoadState('networkidle');

		const formSection = page.locator('section[aria-label="Form"]');
		await formSection
			.locator('form[action="?/fail"]')
			.getByRole('button', { name: 'Save changes' })
			.click();
		await expect(formSection.locator('input[name="failed-name"]')).toHaveAttribute(
			'aria-invalid',
			'true'
		);
		await expect(formSection).toContainText('already');
		await expect(page.locator('[data-scope="toast"][data-part="root"]')).toHaveCount(0);
		const save = formSection
			.locator('form[action="?/save"]')
			.getByRole('button', { name: 'Save name' });
		await save.click();
		await expect(save).toHaveAttribute('aria-busy', 'true');
		await expect(
			page.locator('[data-scope="toast"][data-part="group"][role="status"]')
		).toContainText('Household name saved.');
		await formSection
			.locator('form[action="?/redirect"]')
			.getByRole('button', { name: 'Save', exact: true })
			.click();
		await expect(page.locator('[data-redirect-result]')).toBeVisible();
		await expect(
			page.locator('[data-scope="toast"][data-part="group"][role="status"]')
		).toContainText('Household name saved.');

		const confirmTrigger = page.getByRole('button', { name: 'Delete', exact: true });
		await confirmTrigger.focus();
		await page.keyboard.press('Enter');
		const dialog = page.getByRole('alertdialog', { name: 'Delete member type "Vecino"?' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(dialog.getByRole('button', { name: 'Delete' })).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(confirmTrigger).toBeFocused();

		const menuTrigger = page.getByRole('button', { name: 'Ana Pérez' });
		await menuTrigger.focus();
		await page.keyboard.press('Enter');
		const menu = page.getByRole('menu');
		await expect(menu).toBeVisible();
		await expect(menu.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
			'data-highlighted',
			''
		);
		await page.keyboard.press('ArrowDown');
		await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toHaveAttribute(
			'data-highlighted',
			''
		);
		await page.keyboard.press('Escape');
		await expect(menuTrigger).toBeFocused();

		await page
			.locator('section[aria-label="Dialog, ConfirmDialog, Menu, Tooltip, Toaster"]')
			.getByRole('button', { name: 'Save name' })
			.click();
		await expect(
			page.locator('[data-scope="toast"][data-part="group"][role="status"]')
		).toContainText('Household name saved.');
	} finally {
		server.kill();
		await new Promise<void>((resolve) => server.once('exit', () => resolve()));
		rmSync(path.dirname(databasePath), { recursive: true, force: true });
	}
});
