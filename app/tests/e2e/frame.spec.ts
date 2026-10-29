// The signed-in frame (app-shell spec): responsive navigation, user menu, permissions, and the
// right-to-left layout (D10).
import { type Page } from '@playwright/test';
import Database from 'better-sqlite3';
import {
	addMember,
	newDatabasePath,
	prepareDatabase,
	setUpAdmin,
	startApp,
	expect,
	test
} from './app.ts';

async function startWithMember() {
	const databasePath = newDatabasePath();
	const tokens = await prepareDatabase(databasePath, async (db) => ({
		admin: (await setUpAdmin(db)).token,
		member: await addMember(db)
	}));
	const app = startApp(databasePath);
	await app.listening;
	return { app, tokens };
}

const noHorizontalScroll = (page: Page) =>
	page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;

test('Narrow screen: a bottom navigation bar, and no horizontal scrolling at 360 px', async ({
	page,
	context
}) => {
	const { app, tokens } = await startWithMember();
	await page.setViewportSize({ width: 360, height: 740 });
	await context.addCookies([{ name: 'session', value: tokens.admin, url: app.url }]);
	await page.goto(`${app.url}/`);
	const nav = await box(page, 'nav');
	expect(nav.y + nav.height).toBeCloseTo(740, 0);
	expect(nav.width).toBeCloseTo(360, 0);
	expect(await noHorizontalScroll(page)).toBe(true);
});

test('Wide screen: a side navigation next to the content from 1024 px', async ({
	page,
	context
}) => {
	const { app, tokens } = await startWithMember();
	await page.setViewportSize({ width: 1024, height: 768 });
	await context.addCookies([{ name: 'session', value: tokens.admin, url: app.url }]);
	await page.goto(`${app.url}/`);
	const [nav, main] = [await box(page, 'nav'), await box(page, 'main')];
	expect(nav.x).toBe(0);
	expect(main.x).toBeGreaterThanOrEqual(nav.x + nav.width);
	expect(nav.height).toBeCloseTo(768, 0);
	expect(await noHorizontalScroll(page)).toBe(true);
});

test('Navigation follows permissions: Settings for the admin, not for a member', async ({
	page,
	context
}) => {
	const { app, tokens } = await startWithMember();
	const nav = page.getByRole('navigation', { name: 'Main' });
	await context.addCookies([{ name: 'session', value: tokens.admin, url: app.url }]);
	await page.goto(`${app.url}/`);
	await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();
	await context.clearCookies();
	await context.addCookies([{ name: 'session', value: tokens.member, url: app.url }]);
	await page.goto(`${app.url}/`);
	await expect(nav.getByRole('link')).toHaveText(['Home']);
});

test('User menu: the display name, a Profile link and a Sign out action', async ({
	page,
	context
}) => {
	const { app, tokens } = await startWithMember();
	await context.addCookies([{ name: 'session', value: tokens.member, url: app.url }]);
	await page.goto(`${app.url}/`);
	await page.getByText('Luis').click();
	await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	await page.getByRole('link', { name: 'Profile' }).click();
	await expect(page).toHaveURL(`${app.url}/profile`);
});

test.describe('Right-to-left page', () => {
	test.use({ locale: 'ar', viewport: { width: 1024, height: 768 } });

	test('declares rtl and mirrors the navigation, forms and text alignment', async ({
		page,
		context
	}) => {
		const { app, tokens } = await startWithMember();
		// Arabic installed as a test fixture: no texts, so English shows, laid out right to left.
		const db = new Database(app.databasePath);
		db.prepare("INSERT INTO languages VALUES ('ar', 'active', 0, ?)").run(Date.now());
		db.close();

		await page.goto(`${app.url}/login`);
		await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
		// The label's text, not its box: a full-width label box looks the same in both directions.
		const text = await page.evaluate(() => {
			const range = document.createRange();
			range.selectNodeContents(document.querySelector('label')!);
			const { left, right } = range.getBoundingClientRect();
			return { left, right };
		});
		const input = await box(page, 'input[name="username"]');
		expect(text.right).toBeCloseTo(input.x + input.width, 0);
		expect(text.left).toBeGreaterThan(input.x + input.width / 2);

		await context.addCookies([{ name: 'session', value: tokens.admin, url: app.url }]);
		await page.goto(`${app.url}/`);
		const [nav, main] = [await box(page, 'nav'), await box(page, 'main')];
		expect(nav.x + nav.width).toBeCloseTo(1024, 0);
		expect(main.x + main.width).toBeLessThanOrEqual(nav.x);
		const heading = await box(page, 'h1');
		expect(heading.x + heading.width).toBeGreaterThan(main.x + main.width / 2);
	});
});
