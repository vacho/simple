// The temporary password gate (ADR 0027) on real HTTP responses of the production build.
import Database from 'better-sqlite3';
import { signIn } from '../../src/lib/features/auth/server/index.ts';
import { testCtx } from '../../src/lib/server/core/ctx.ts';
import { openDatabase } from '../../src/lib/server/db/client.ts';
import {
	addMember,
	memberPassword,
	proxyHeaders,
	newDatabasePath,
	prepareDatabase,
	setUpAdmin,
	startApp,
	type App,
	expect,
	test
} from './app.ts';

const page = { accept: 'text/html' };
const get = (app: App, pathname: string, cookie: string) =>
	fetch(`${app.url}${pathname}`, {
		headers: { ...proxyHeaders, ...page, cookie },
		redirect: 'manual'
	});
const post = (app: App, pathname: string, cookie: string, body: string) =>
	fetch(`${app.url}${pathname}`, {
		method: 'POST',
		headers: {
			...proxyHeaders,
			cookie,
			origin: app.url,
			'content-type': 'application/x-www-form-urlencoded',
			accept: 'application/json'
		},
		body,
		redirect: 'manual'
	});

async function startWithTemporaryPassword() {
	const databasePath = newDatabasePath();
	const token = await prepareDatabase(databasePath, async (db) => {
		await setUpAdmin(db);
		return addMember(db, 'lucia', { passwordTemporary: true });
	});
	const app = startApp(databasePath);
	await app.listening;
	return { app, cookie: `session=${token}` };
}

test('Other pages wait for the new password, and Temporary password allows only the password change: every page leads to it', async () => {
	const { app, cookie } = await startWithTemporaryPassword();
	const home = await get(app, '/', cookie);
	expect([home.status, home.headers.get('location')]).toEqual([303, '/password']);
	for (const pathname of ['/members', '/profile', '/settings']) {
		const response = await get(app, pathname, cookie);
		expect([response.status, response.headers.get('location')], pathname).toEqual([
			303,
			`/password?redirectTo=${encodeURIComponent(pathname)}`
		]);
	}
});

test('Other operations wait for the new password: a form post is refused and writes nothing', async () => {
	const { app, cookie } = await startWithTemporaryPassword();
	const response = await post(app, '/profile', cookie, 'locale=es&timeZone=America%2FLa_Paz');
	// Refused by the gate, not by the cross-site check.
	expect([response.status, await response.text()]).toEqual([403, 'Forbidden']);
	const db = new Database(app.databasePath, { readonly: true });
	expect(db.prepare("SELECT locale, time_zone FROM users WHERE username = 'lucia'").get()).toEqual({
		locale: null,
		time_zone: null
	});
	db.close();
});

test('Sign-out with a temporary password: allowed, and the next sign-in leads to the password change again', async () => {
	const { app, cookie } = await startWithTemporaryPassword();
	const response = await post(app, '/logout', cookie, '');
	expect(response.status).toBeLessThan(400);
	expect((await get(app, '/', cookie)).headers.get('location')).toBe('/login');

	const db = openDatabase(app.databasePath);
	const { token } = await signIn(testCtx(db), {
		username: 'lucia',
		password: memberPassword,
		address: '127.0.0.1'
	});
	db.$client.close();
	expect((await get(app, '/', `session=${token}`)).headers.get('location')).toBe('/password');
});

test('a user without a temporary password is not sent to the password change', async () => {
	const databasePath = newDatabasePath();
	const admin = await prepareDatabase(databasePath, setUpAdmin);
	const app = startApp(databasePath);
	await app.listening;
	expect((await get(app, '/', `session=${admin.token}`)).status).toBe(200);
});
