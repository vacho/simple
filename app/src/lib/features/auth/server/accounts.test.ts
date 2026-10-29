// Password resets and deactivation (spec user-auth; ADR 0027): the sessions they end and what
// sign-in does afterwards.
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { UserActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { Forbidden, Invalid } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { sessions, users } from '../../../server/db/schema.ts';
import { setActive } from '../../users/server/index.ts';
import { hashPassword } from './password.ts';
import { deactivate, resetPassword, resolveActor, signIn } from './service.ts';

const db = createTestDatabase();
const anonymousCtx = testCtx(db);
const actor = (id: number, role: UserActor['role']): UserActor => ({
	kind: 'user',
	id,
	role,
	locale: null,
	timeZone: null,
	passwordTemporary: false
});
let addresses = 0;
const insert = async (username: string, role: UserActor['role'], password: string) =>
	db
		.insert(users)
		.values({
			username,
			displayName: username,
			passwordHash: await hashPassword(password),
			role,
			createdAt: new Date()
		})
		.returning()
		.get().id;
const signInAs = (username: string, password: string) =>
	signIn(anonymousCtx, { username, password, address: `10.3.0.${++addresses}` });
const caught = (promise: Promise<unknown>) =>
	promise.then(
		() => undefined,
		(error) => error
	);
const sessionsOf = (userId: number) =>
	db.select().from(sessions).where(eq(sessions.userId, userId)).all();

const adminId = await insert('ana', 'admin', 'admin password');
const admin = testCtx(db, { actor: actor(adminId, 'admin') });

describe('Administrators reset passwords', () => {
	it('Reset a forgotten password: sessions end, only the new one works, and it is temporary', async () => {
		const id = await insert('lucia', 'member', 'old password');
		const { token } = await signInAs('lucia', 'old password');
		await resetPassword(admin, id, { password: 'nueva-temporal-1' });
		expect(sessionsOf(id)).toEqual([]);
		expect(resolveActor(anonymousCtx, token).actor.kind).toBe('anonymous');
		expect(await caught(signInAs('lucia', 'old password'))).toBeInstanceOf(Invalid);
		const fresh = await signInAs('lucia', 'nueva-temporal-1');
		expect(resolveActor(anonymousCtx, fresh.token).actor).toMatchObject({
			passwordTemporary: true
		});
	});

	it("No reset of one's own account: refused", async () => {
		expect(
			await caught(resetPassword(admin, adminId, { password: 'whatever long' }))
		).toBeInstanceOf(Forbidden);
	});

	it('Member cannot reset passwords', async () => {
		const id = await insert('mario', 'member', 'mario password');
		const member = testCtx(db, { actor: actor(id, 'member') });
		expect(
			await caught(resetPassword(member, adminId, { password: 'whatever long' }))
		).toBeInstanceOf(Forbidden);
	});

	it('the new password follows the password rules', async () => {
		const id = await insert('nora', 'member', 'nora password');
		const error = await caught(resetPassword(admin, id, { password: 'short' }));
		expect(error).toBeInstanceOf(Invalid);
		expect((error as Invalid).issues[0]).toMatchObject({
			field: 'password',
			key: 'users.password.length'
		});
	});
});

describe('Deactivating accounts', () => {
	it('Deactivate an account: the next request is anonymous, and the sessions are gone', async () => {
		const id = await insert('pia', 'member', 'pia password');
		const { token } = await signInAs('pia', 'pia password');
		deactivate(admin, id);
		expect(resolveActor(anonymousCtx, token).actor.kind).toBe('anonymous');
		expect(sessionsOf(id)).toEqual([]);
	});

	it('Deactivated account cannot sign in: "Invalid username or password"', async () => {
		const error = await caught(signInAs('pia', 'pia password'));
		expect(error).toBeInstanceOf(Invalid);
		expect((error as Invalid).issues[0].key).toBe('auth.sign_in.invalid');
	});

	it('Reactivate an account: sign-in works again with the same password', async () => {
		const id = db.select().from(users).where(eq(users.username, 'pia')).get()!.id;
		setActive(admin, id, true);
		expect(await caught(signInAs('pia', 'pia password'))).toBeUndefined();
	});

	it('Member cannot deactivate accounts', async () => {
		const id = await insert('quique', 'member', 'quique password');
		expect(() => deactivate(testCtx(db, { actor: actor(id, 'member') }), adminId)).toThrow(
			Forbidden
		);
		expect(db.select().from(users).where(eq(users.id, adminId)).get()!.active).toBe(true);
	});
});
