// Every screen the suite covers, read as a user sees it (localization spec, D14). The normal run
// uses a Spanish browser: no English text may appear. npm run test:e2e:pseudo uses en-XA: every
// text must be pseudo-localized, so hard-coded text stands out, and long texts must not overflow.
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type Page } from '@playwright/test';
import {
	addMember,
	appRoot,
	expect,
	newDatabasePath,
	prepareDatabase,
	setUpAdmin,
	startApp,
	test
} from './app.ts';

const pseudo = process.env.I18N_PSEUDO === '1';
const locale = pseudo ? 'en-XA' : 'es-BO';
const catalog = (code: string) =>
	JSON.parse(readFileSync(path.join(appRoot, `messages/${code}.json`), 'utf8')) as Record<
		string,
		{ text: string }
	>;
const { version } = JSON.parse(readFileSync(path.join(appRoot, 'package.json'), 'utf8'));

// English texts that Spanish translates differently, with their placeholders as sample values.
const sample = (text: string) =>
	text
		.replace(/\{minutes, plural, one \{# (\w+)\} other \{# (\w+)\}\}/, '15 $2')
		.replace('{version}', version);
const english = (() => {
	const [en, es] = [catalog('en'), catalog('es')];
	return new Set(
		Object.keys(en)
			.filter((key) => en[key].text !== es[key].text)
			.map((key) => sample(en[key].text))
	);
})();

// Data the user entered or that is not a translatable text.
const notTranslatable = ['Ana Pérez', 'Luis', 'ana', 'toño', 'Toño', version];

/** Visible texts of the page, outside select options (language and time zone names). */
const visibleTexts = (page: Page) =>
	page.evaluate(() => {
		const texts = [document.title];
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const parent = node.parentElement!;
			const text = node.textContent!.trim();
			if (!text || parent.closest('option, script, style')) continue;
			const style = getComputedStyle(parent);
			if (style.display === 'none' || style.visibility === 'hidden') continue;
			texts.push(text);
		}
		return texts;
	});

/** Text elements cut off by their box, or a page that scrolls sideways. */
const overflows = (page: Page) =>
	page.evaluate(() => {
		const clipped = [...document.querySelectorAll('h1, p, label, button, a, summary')]
			.filter((element) => element.scrollWidth > element.clientWidth + 1)
			.map((element) => element.textContent?.trim());
		if (document.documentElement.scrollWidth > window.innerWidth) clipped.push('(page scrolls)');
		return clipped;
	});

async function check(page: Page, screen: string) {
	const texts = (await visibleTexts(page)).filter((text) => !notTranslatable.includes(text));
	if (pseudo) {
		expect(
			texts.filter((text) => !/^\[.*~\]$|^\[.*~+\]/s.test(text)),
			`${screen}: plain text`
		).toEqual([]);
		expect(await overflows(page), `${screen}: overflow`).toEqual([]);
	} else {
		expect(
			texts.filter((text) => english.has(text)),
			`${screen}: English text`
		).toEqual([]);
	}
}

test.describe(`${pseudo ? 'No plain text in en-XA' : 'Spanish is complete'}: every covered screen @screens`, () => {
	test.use({ locale, viewport: { width: 360, height: 740 } });

	test('setup, with its validation errors', async ({ page }) => {
		const app = startApp(newDatabasePath());
		await app.listening;
		await page.goto(`${app.url}/setup`);
		await check(page, 'setup');
		await page.locator('input[name="displayName"]').fill('Toño');
		await page.locator('input[name="username"]').fill('toño');
		await page.locator('input[name="password"]').fill('short');
		await page.locator('button[type="submit"]').click();
		await expect(page.locator('.error').first()).toBeVisible();
		await check(page, 'setup errors');
	});

	test('sign-in, wrong credentials and lockout; home, settings, profile and its errors', async ({
		page
	}) => {
		const databasePath = newDatabasePath();
		await prepareDatabase(databasePath, (db) => setUpAdmin(db));
		const app = startApp(databasePath);
		await app.listening;
		const submit = async (password: string) => {
			await page.locator('input[name="username"]').fill('ana');
			await page.locator('input[name="password"]').fill(password);
			await page.locator('button[type="submit"]').click();
		};

		await page.goto(`${app.url}/login`);
		await check(page, 'sign-in');
		await submit('wrong password');
		await expect(page.getByRole('alert')).toBeVisible();
		await check(page, 'sign-in, wrong credentials');
		for (let i = 0; i < 4; i++) await submit('wrong password');
		await check(page, 'sign-in, locked');

		// Unlock, to sign in and reach the other screens.
		const db = new Database(databasePath);
		db.exec('DELETE FROM login_attempts');
		db.close();
		await submit('correct horse battery');
		await expect(page).toHaveURL(`${app.url}/`);
		await check(page, 'home');
		await page.locator('summary').click();
		await check(page, 'home, user menu open');
		for (const screen of ['/settings', '/profile', '/nowhere']) {
			await page.goto(`${app.url}${screen}`);
			await check(page, screen);
		}
		await page.goto(`${app.url}/profile`);
		await page.locator('select[name="timeZone"]').evaluate((select: HTMLSelectElement) => {
			select.add(new Option('+02:00', '+02:00', true, true));
		});
		await page.locator('main button[type="submit"]').click();
		await expect(page.locator('.error')).toBeVisible();
		await check(page, 'profile, invalid zone');
	});

	test('the not-allowed page and the offline page', async ({ page, context }) => {
		const databasePath = newDatabasePath();
		const member = await prepareDatabase(databasePath, async (db) => {
			await setUpAdmin(db);
			return addMember(db);
		});
		const app = startApp(databasePath);
		await app.listening;
		await context.addCookies([{ name: 'session', value: member, url: app.url }]);
		await page.goto(`${app.url}/settings`);
		await check(page, 'not allowed');
		await page.goto(`${app.url}/offline`);
		await expect(page.locator('html')).toHaveAttribute('lang', pseudo ? 'en-XA' : 'es');
		await check(page, 'offline');
	});
});
