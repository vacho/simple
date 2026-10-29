// The en-XA pseudo-locale exists only when the server starts with I18N_PSEUDO=1 (D14).
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { appRoot, newDatabasePath, prepareDatabase, setUpAdmin, startApp } from './app.ts';

async function homeInPseudoLocale(env: Record<string, string>) {
	const databasePath = newDatabasePath();
	const { token } = await prepareDatabase(databasePath, (db) => setUpAdmin(db));
	const app = startApp(databasePath, env);
	await app.listening;
	const response = await fetch(`${app.url}/`, {
		headers: { 'accept-language': 'en-XA', cookie: `session=${token}` }
	});
	const html = await response.text();
	await app.stop();
	return { html, output: app.output() };
}

test('a production start without the flag has no en-XA', async () => {
	const { html, output } = await homeInPseudoLocale({});
	expect(html).toContain('<html lang="en" dir="ltr">');
	expect(html).toContain('<h1>Home</h1>');
	expect(output).not.toContain('I18N_PSEUDO');
});

test('with I18N_PSEUDO=1 every text is pseudo-localized, with a startup warning', async () => {
	const { html, output } = await homeInPseudoLocale({ I18N_PSEUDO: '1' });
	expect(html).toContain('<html lang="en-XA" dir="ltr">');
	expect(html).toMatch(/<h1>\[Ĥöɱé ~+\]<\/h1>/);
	expect(output).toContain('I18N_PSEUDO is set');
});

test('.env.example does not set the flag', () => {
	expect(readFileSync(path.join(appRoot, '.env.example'), 'utf8')).not.toContain('I18N_PSEUDO');
});
