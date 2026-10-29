import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	addMember,
	appRoot,
	newDatabasePath,
	prepareDatabase,
	setUpAdmin,
	startApp
} from './app.ts';

const { version } = JSON.parse(readFileSync(path.join(appRoot, 'package.json'), 'utf8'));

async function startWithMember() {
	const databasePath = newDatabasePath();
	const tokens = await prepareDatabase(databasePath, async (db) => ({
		admin: (await setUpAdmin(db)).token,
		member: await addMember(db)
	}));
	const app = startApp(databasePath);
	await app.listening;
	const open = (token: string, acceptLanguage = 'en') =>
		fetch(`${app.url}/settings`, {
			headers: {
				cookie: `session=${token}`,
				accept: 'text/html',
				'accept-language': acceptLanguage
			}
		});
	return { app, tokens, open };
}

test('Non-administrator is denied: a translated "not allowed" page, without the data', async () => {
	const { tokens, open } = await startWithMember();
	for (const [language, text] of [
		['en', "You're not allowed to see this page."],
		['es', 'No tienes permiso para ver esta página.']
	]) {
		const response = await open(tokens.member, language);
		const html = await response.text();
		expect(response.status).toBe(403);
		expect(html).toContain(`<h1>${text}</h1>`);
		expect(html).not.toContain(version);
	}
});

test('Administrator is allowed: the settings page shows the app version', async () => {
	const { tokens, open } = await startWithMember();
	const response = await open(tokens.admin);
	expect(response.status).toBe(200);
	expect(await response.text()).toContain(`App version ${version}`);
});

// Missing and forbidden records get the same denial: server/web/responses.test.ts.
test('an address matching no page shows a translated not-found page', async () => {
	const { app, tokens } = await startWithMember();
	const missing = await fetch(`${app.url}/nowhere`, {
		headers: { cookie: `session=${tokens.member}`, accept: 'text/html', 'accept-language': 'es' }
	});
	expect(missing.status).toBe(404);
	expect(await missing.text()).toContain('<h1>Esta página no existe.</h1>');
});
