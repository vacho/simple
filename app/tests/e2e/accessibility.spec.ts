// Keyboard operability and automated accessibility checks of the shell pages.
import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';
import { newDatabasePath, startApp, startSetUpApp, expect, test } from './app.ts';

test('Keyboard navigation: the frame is reachable in order, with a visible focus indicator', async ({
	page,
	context
}) => {
	const { app, admin } = await startSetUpApp();
	await page.setViewportSize({ width: 1024, height: 768 });
	await context.addCookies([{ name: 'session', value: admin.token, url: app.url }]);
	await page.goto(`${app.url}/`);

	const focused = () =>
		page.evaluate(() => {
			const element = document.activeElement as HTMLElement;
			const style = getComputedStyle(element);
			return {
				text: element.textContent?.trim(),
				outline: style.outlineStyle,
				width: style.outlineWidth
			};
		});
	const order: (string | undefined)[] = [];
	for (let i = 0; i < 4; i++) {
		await page.keyboard.press('Tab');
		const element = await focused();
		expect(element.outline, `focus indicator on ${element.text}`).toBe('solid');
		expect(element.width).toBe('3px');
		order.push(element.text);
	}
	expect(order).toEqual(['Skip to content', 'Ana Pérez', 'Home', 'Settings']);

	// The user menu opens with Enter, and its links are next in the order.
	await page.keyboard.press('Shift+Tab');
	await page.keyboard.press('Shift+Tab');
	await page.keyboard.press('Enter');
	await page.keyboard.press('Tab');
	expect((await focused()).text).toBe('Profile');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(`${app.url}/profile`);
});

async function seriousViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).analyze();
	return violations
		.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
		.map(
			(violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`
		);
}

for (const locale of ['en-US', 'es-BO']) {
	test.describe(`axe in ${locale}`, () => {
		test.use({ locale });

		test('no serious violations on setup, sign-in, home and profile', async ({ page, context }) => {
			const empty = startApp(newDatabasePath());
			await empty.listening;
			await page.goto(`${empty.url}/setup`);
			expect(await seriousViolations(page), 'setup').toEqual([]);

			const { app, admin } = await startSetUpApp();
			await page.goto(`${app.url}/login`);
			expect(await seriousViolations(page), 'sign-in').toEqual([]);

			await context.addCookies([{ name: 'session', value: admin.token, url: app.url }]);
			for (const path of ['/', '/profile']) {
				await page.goto(`${app.url}${path}`);
				expect(await seriousViolations(page), path).toEqual([]);
			}
		});
	});
}
