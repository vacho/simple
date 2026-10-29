// The request pipeline (D5) on real HTTP responses of the production build.
import Database from 'better-sqlite3';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { getDictionary } from '../../src/lib/features/languages/server/index.ts';
import { testCtx } from '../../src/lib/server/core/ctx.ts';
import {
	appRoot,
	newDatabasePath,
	prepareDatabase,
	startApp,
	startSetUpApp,
	type App,
	expect,
	test
} from './app.ts';

const day = 24 * 60 * 60 * 1000;
const page = { accept: 'text/html' };
const get = (app: App, pathname: string, headers: Record<string, string> = {}) =>
	fetch(`${app.url}${pathname}`, { headers, redirect: 'manual' });
const setExpiry = (app: App, expiresAt: number) => {
	const db = new Database(app.databasePath);
	db.prepare('UPDATE sessions SET expires_at = ?').run(expiresAt);
	db.close();
};

test.describe('sessions', () => {
	test('a fresh session sends no Set-Cookie', async () => {
		const { app, cookie } = await startSetUpApp();
		const response = await get(app, '/', { ...page, cookie });
		expect(response.status).toBe(200);
		expect(response.headers.get('set-cookie')).toBeNull();
		await app.stop();
	});

	test('a session needing renewal gets a Set-Cookie with the new Max-Age', async () => {
		const { app, cookie } = await startSetUpApp();
		setExpiry(app, Date.now() + 28 * day);
		const setCookie = (await get(app, '/', { ...page, cookie })).headers.get('set-cookie') ?? '';
		expect(setCookie).toMatch(/^session=[a-z2-7]{32};/);
		expect(setCookie).toMatch(/Max-Age=259(1999|2000)/);
		expect(setCookie).toMatch(/HttpOnly/i);
		expect(setCookie).toMatch(/SameSite=Lax/i);
		await app.stop();
	});

	test('an expired session gets a cookie-clearing Set-Cookie', async () => {
		const { app, cookie } = await startSetUpApp();
		setExpiry(app, Date.now() - 1);
		const response = await get(app, '/', { ...page, cookie });
		expect(response.headers.get('set-cookie')).toMatch(/^session=;.*Max-Age=0/);
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/login');
		await app.stop();
	});
});

test('Preference wins over the browser: saved Spanish on an English browser, same request', async () => {
	const { app, cookie } = await startSetUpApp({ locale: 'es' });
	const html = await (
		await get(app, '/', { ...page, cookie, 'accept-language': 'en-US,en' })
	).text();
	expect(html).toContain('<html lang="es" dir="ltr">');
	expect(html).toContain('<h1>Inicio</h1>');
	await app.stop();
});

test.describe('Initial entry leads to setup', () => {
	test('Opening the app root and the sign-in page on an empty installation', async () => {
		const app = startApp(newDatabasePath());
		await app.listening;
		for (const pathname of ['/', '/login']) {
			const response = await get(app, pathname, page);
			expect(response.status, pathname).toBe(303);
			expect(response.headers.get('location'), pathname).toBe('/setup');
		}
		await app.stop();
	});

	test('After setup, a visitor who is not signed in is sent to sign in', async () => {
		const { app } = await startSetUpApp();
		const root = await get(app, '/', page);
		expect([root.status, root.headers.get('location')]).toEqual([303, '/login']);
		const deep = await get(app, '/settings?x=1', page);
		expect(deep.headers.get('location')).toBe('/login?redirectTo=%2Fsettings%3Fx%3D1');
		await app.stop();
	});
});

test('Anonymous request to a protected endpoint: 401 and no operation', async () => {
	const { app } = await startSetUpApp();
	const response = await fetch(`${app.url}/`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: app.url },
		body: '{}',
		redirect: 'manual'
	});
	expect(response.status).toBe(401);
	expect((await get(app, '/settings', { accept: 'application/json' })).status).toBe(401);
	await app.stop();
});

test('Translations load before sign-in, and public files skip setup and sign-in', async () => {
	const asset = readdirSync(path.join(appRoot, 'build/client/_app/immutable/entry'))[0];
	const publicPaths = async (databasePath: string) => {
		const { url } = await prepareDatabase(databasePath, (db) => getDictionary(testCtx(db), 'es'));
		return [
			url,
			`/_app/immutable/entry/${asset}`,
			'/robots.txt',
			'/manifest.webmanifest',
			'/offline'
		];
	};
	const empty = startApp(newDatabasePath());
	const { app: setUp } = await startSetUpApp();
	await empty.listening;
	for (const app of [empty, setUp]) {
		const [dictionary, ...others] = await publicPaths(app.databasePath);
		const response = await get(app, dictionary, page);
		expect(response.status, dictionary).toBe(200);
		expect(response.headers.get('cache-control')).toContain('immutable');
		for (const pathname of others) {
			// Files of later tasks (manifest, offline page) may not exist yet: never a redirect or 401.
			expect([303, 401], pathname).not.toContain((await get(app, pathname, page)).status);
		}
	}
	await empty.stop();
	await setUp.stop();
});
