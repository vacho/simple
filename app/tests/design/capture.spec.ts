// npm run design:capture (ADR 0030): reference captures of every shipped screen, with the demo
// household, at phone and desktop width, written to docs/design/screens/<screen>/ in the handoff
// format (docs/design/README.md). Run it on main after a change that alters screens, and commit
// the result as project docs. Never point it at the household's real database.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import {
	addMember,
	appRoot,
	newDatabasePath,
	prepareDatabase,
	startApp,
	test,
	type App
} from '../e2e/app.ts';
import { seedDemoHousehold, type DemoHousehold } from './demo-household.ts';

const screensDir = path.resolve(appRoot, '../docs/design/screens');
const today = new Date().toISOString().slice(0, 10);
const widths = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };

interface Screen {
	/** Folder under docs/design/screens/, as named in docs/design/screens.md. */
	folder: string;
	title: string;
	/** Who is signed in: the administrator, a user who must change their password, or nobody. */
	as: 'admin' | 'temporary' | 'nobody';
	path: (demo: DemoHousehold) => string;
}

const screens: Screen[] = [
	{ folder: 'sign-in', title: 'Sign in', as: 'nobody', path: () => '/login' },
	{ folder: 'password-change', title: 'Password change', as: 'temporary', path: () => '/password' },
	{ folder: 'home', title: 'Home', as: 'admin', path: () => '/' },
	{ folder: 'members', title: 'Members', as: 'admin', path: () => '/members' },
	{
		folder: 'member',
		title: 'A member',
		as: 'admin',
		path: (demo) => `/members/${demo.memberWithAccount}`
	},
	{ folder: 'settings', title: 'Settings', as: 'admin', path: () => '/settings' },
	{ folder: 'household', title: 'Household', as: 'admin', path: () => '/settings/household' },
	{
		folder: 'member-types',
		title: 'Member types',
		as: 'admin',
		path: () => '/settings/member-types'
	},
	{ folder: 'accounts', title: 'Accounts', as: 'admin', path: () => '/settings/accounts' },
	{ folder: 'profile', title: 'Profile', as: 'admin', path: () => '/profile' },
	{ folder: 'error', title: 'Error', as: 'admin', path: () => '/nowhere' },
	{ folder: 'offline', title: 'Offline', as: 'nobody', path: () => '/offline' }
];

function sourceMd(title: string, version: string): string {
	return `# ${title}

- Tool: capture of the shipped screen (\`npm run design:capture\`)
- Link: none
- Version: app v${version}
- Exported: ${today}
- Approved by: baseline, the screen as shipped before ADR 0030
- Notes: demo household (fictitious data), English, light theme. Built from the component library; not a design to copy from.
`;
}

async function shoot(page: Page, app: App, folder: string, url: string) {
	const dir = path.join(screensDir, folder);
	mkdirSync(dir, { recursive: true });
	for (const [name, size] of Object.entries(widths)) {
		await page.setViewportSize(size);
		await page.goto(`${app.url}${url}`);
		await page.waitForLoadState('networkidle');
		// A window as tall as the page, rather than a full-page screenshot, so fixed navigation
		// sits where the user sees it (at the bottom on phones, full height on the side).
		const height = await page.evaluate(() => document.documentElement.scrollHeight);
		await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
		await page.screenshot({ path: path.join(dir, `${name}.png`) });
	}
}

test.use({ locale: 'en', colorScheme: 'light' });

test('capture every shipped screen with the demo household', async ({ page, context }) => {
	test.setTimeout(180_000);
	const { version } = await import('../../package.json', { with: { type: 'json' } }).then(
		(module) => module.default
	);

	// Setup is only reachable before the household exists: capture it on an empty installation.
	const empty = startApp(newDatabasePath());
	await empty.listening;
	await shoot(page, empty, 'setup', '/setup');
	writeFileSync(path.join(screensDir, 'setup', 'source.md'), sourceMd('Setup', version));
	await empty.stop();

	const databasePath = newDatabasePath();
	const { demo, temporary } = await prepareDatabase(databasePath, async (db) => ({
		demo: await seedDemoHousehold(db),
		temporary: await addMember(db, 'sofia', { passwordTemporary: true })
	}));
	const app = startApp(databasePath);
	await app.listening;
	const sessions = { admin: demo.adminToken, temporary, nobody: undefined };

	for (const screen of screens) {
		await context.clearCookies();
		const token = sessions[screen.as];
		if (token) await context.addCookies([{ name: 'session', value: token, url: app.url }]);
		await shoot(page, app, screen.folder, screen.path(demo));
		writeFileSync(
			path.join(screensDir, screen.folder, 'source.md'),
			sourceMd(screen.title, version)
		);
	}
});
