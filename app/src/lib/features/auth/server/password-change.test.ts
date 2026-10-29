// Changing one's own password, forced or not (spec user-auth; design D3).
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { testCtx } from '../../../server/core/ctx.ts';
import { Invalid, Throttled } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { loginAttempts, sessions, users } from '../../../server/db/schema.ts';
import { hashPassword } from './password.ts';
import { changeOwnPassword, resolveActor, signIn } from './service.ts';

const db = createTestDatabase();
const anonymousCtx = testCtx(db);
let addresses = 0;
const address = () => `10.5.0.${++addresses}`;
const caught = (promise: Promise<unknown>) =>
	promise.then(
		() => undefined,
		(error) => error
	);

async function account(username: string, password: string, passwordTemporary = false) {
	db.insert(users)
		.values({
			username,
			displayName: username,
			passwordHash: await hashPassword(password),
			role: 'member',
			passwordTemporary,
			createdAt: new Date()
		})
		.run();
}
const signInAs = async (username: string, password: string) => {
	const { token } = await signIn(anonymousCtx, { username, password, address: address() });
	const { actor } = resolveActor(anonymousCtx, token);
	return { token, ctx: testCtx(db, { actor }) };
};
const canSignIn = async (username: string, password: string) =>
	(await caught(signIn(anonymousCtx, { username, password, address: address() }))) === undefined;
const failures = (username: string) =>
	db
		.select()
		.from(loginAttempts)
		.all()
		.find((row) => row.kind === 'username' && row.key === username)?.failures ?? 0;
const sessionCount = (username: string) => {
	const id = db.select().from(users).where(eq(users.username, username)).get()!.id;
	return db.select().from(sessions).where(eq(sessions.userId, id)).all().length;
};

describe("Changing one's own password", () => {
	it('Change own password: changed, this session stays, the other devices are signed out', async () => {
		await account('carmen', 'carmen password');
		const phone = await signInAs('carmen', 'carmen password');
		const laptop = await signInAs('carmen', 'carmen password');
		await changeOwnPassword(laptop.ctx, laptop.token, {
			current: 'carmen password',
			password: 'otra-clave-larga',
			confirm: 'otra-clave-larga',
			address: address()
		});
		expect(resolveActor(anonymousCtx, laptop.token).actor.kind).toBe('user');
		expect(resolveActor(anonymousCtx, phone.token).actor.kind).toBe('anonymous');
		expect(sessionCount('carmen')).toBe(1);
		expect(await canSignIn('carmen', 'otra-clave-larga')).toBe(true);
		expect(await canSignIn('carmen', 'carmen password')).toBe(false);
	});

	it('Wrong current password: rejected, unchanged, and one failure counted', async () => {
		await account('diego', 'diego password');
		const { token, ctx } = await signInAs('diego', 'diego password');
		const error = await caught(
			changeOwnPassword(ctx, token, {
				current: 'not my password',
				password: 'brand new pass',
				confirm: 'brand new pass',
				address: address()
			})
		);
		expect(error).toBeInstanceOf(Invalid);
		expect((error as Invalid).issues).toEqual([
			{ field: 'current', key: 'auth.password.current_wrong', params: {} }
		]);
		expect(failures('diego')).toBe(1);
		expect(await canSignIn('diego', 'diego password')).toBe(true);
	});

	it('Throttled password change: sign-in failures and wrong current passwords lock it together', async () => {
		await account('elsa', 'elsa password');
		const { token, ctx } = await signInAs('elsa', 'elsa password');
		for (let i = 0; i < 3; i++) {
			await caught(
				signIn(anonymousCtx, { username: 'elsa', password: 'wrong', address: address() })
			);
		}
		const change = (current: string) =>
			caught(
				changeOwnPassword(ctx, token, {
					current,
					password: 'brand new pass',
					confirm: 'brand new pass',
					address: address()
				})
			);
		await change('wrong one');
		await change('wrong two');
		expect(failures('elsa')).toBe(5);
		const locked = await change('elsa password');
		expect(locked).toBeInstanceOf(Throttled);
		expect((locked as Throttled).key).toBe('auth.sign_in.locked');
	});

	it("New passwords don't match: rejected, unchanged", async () => {
		await account('fede', 'fede password');
		const { token, ctx } = await signInAs('fede', 'fede password');
		const error = await caught(
			changeOwnPassword(ctx, token, {
				current: 'fede password',
				password: 'brand new pass',
				confirm: 'brand new pas',
				address: address()
			})
		);
		expect((error as Invalid).issues[0]).toMatchObject({
			field: 'confirm',
			key: 'auth.password.mismatch'
		});
		expect(await canSignIn('fede', 'fede password')).toBe(true);
	});

	it('New password breaks the password rules: shorter than 8 characters', async () => {
		await account('gala', 'gala password');
		const { token, ctx } = await signInAs('gala', 'gala password');
		const error = await caught(
			changeOwnPassword(ctx, token, {
				current: 'gala password',
				password: 'short',
				confirm: 'short',
				address: address()
			})
		);
		expect((error as Invalid).issues[0]).toMatchObject({
			field: 'password',
			key: 'users.password.length'
		});
	});
});

describe('Temporary password replaced at first sign-in', () => {
	it('Choosing the new password: no current password needed, and it is no longer temporary', async () => {
		await account('lucia', 'primer-dia-2026', true);
		const { token, ctx } = await signInAs('lucia', 'primer-dia-2026');
		await changeOwnPassword(ctx, token, {
			password: 'mi-clave-propia',
			confirm: 'mi-clave-propia',
			address: address()
		});
		expect(resolveActor(anonymousCtx, token).actor).toMatchObject({ passwordTemporary: false });
		expect(await canSignIn('lucia', 'mi-clave-propia')).toBe(true);
	});

	it('New password equal to the temporary one: rejected, still temporary', async () => {
		await account('mateo', 'temporal-mateo', true);
		const { token, ctx } = await signInAs('mateo', 'temporal-mateo');
		const error = await caught(
			changeOwnPassword(ctx, token, {
				password: 'temporal-mateo',
				confirm: 'temporal-mateo',
				address: address()
			})
		);
		expect((error as Invalid).issues[0]).toMatchObject({ key: 'auth.password.same_as_temporary' });
		expect(resolveActor(anonymousCtx, token).actor).toMatchObject({ passwordTemporary: true });
	});
});
