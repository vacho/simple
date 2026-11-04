import { v7 } from 'uuid';
import { resolveActor } from '../../src/lib/features/auth/server/index.ts';
import { createMember, createMemberType } from '../../src/lib/features/household/server/index.ts';
import { testCtx } from '../../src/lib/server/core/ctx.ts';
import {
	addMember,
	expect,
	newDatabasePath,
	open,
	prepareDatabase,
	setUpAdmin,
	startApp,
	test
} from './app.ts';

test('No third-party requests: first-run setup', async ({ page, context }) => {
	const app = startApp(newDatabasePath());
	await app.listening;
	const requests: string[] = [];
	context.on('request', (request) => requests.push(request.url()));
	await open(page, `${app.url}/setup`);
	await expect(page.getByRole('heading', { name: 'Set up the app' })).toBeVisible();
	expect(requests.length).toBeGreaterThan(0);
	expect(requests.filter((url) => new URL(url).origin !== app.url)).toEqual([]);
});

test('No third-party requests: every page, signed out and signed in', async ({ page, context }) => {
	// Four session states, each visiting every page and waiting for its requests.
	test.setTimeout(90_000);
	const databasePath = newDatabasePath();
	const id = v7();
	const tokens = await prepareDatabase(databasePath, async (db) => {
		const admin = await setUpAdmin(db);
		const ctx = testCtx(db, { actor: resolveActor(testCtx(db), admin.token).actor });
		const type = v7();
		createMemberType(ctx, { id: type, name: 'Vecino', baseClass: 'adult' });
		createMember(ctx, { id, name: 'Marcos', memberTypeId: type });
		return {
			admin: admin.token,
			member: await addMember(db),
			temporary: await addMember(db, 'temporary', { passwordTemporary: true })
		};
	});
	const app = startApp(databasePath);
	await app.listening;
	const requests: string[] = [];
	context.on('request', (request) => requests.push(request.url()));
	const paths = [
		'/',
		'/setup',
		'/login',
		'/profile',
		'/members',
		`/members/${id}`,
		'/settings',
		'/settings/household',
		'/settings/member-types',
		'/settings/accounts',
		'/password',
		'/offline',
		'/not-found',
		'/dev/components'
	];
	for (const token of [null, tokens.admin, tokens.member, tokens.temporary]) {
		await context.clearCookies();
		if (token) await context.addCookies([{ name: 'session', value: token, url: app.url }]);
		for (const path of paths) {
			await open(page, `${app.url}${path}`);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			expect(
				requests.filter((url) => new URL(url).origin !== app.url),
				path
			).toEqual([]);
		}
	}
	expect(requests.length).toBeGreaterThan(paths.length);
});
