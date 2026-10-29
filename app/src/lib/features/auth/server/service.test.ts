import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemActor, type UserActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { Conflict, Forbidden, Invalid, Throttled } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { sessions, users } from '../../../server/db/schema.ts';
import { getProfile } from '../../users/server/index.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { loginAttempts } from './schema.ts';
import { resolveActor, setup, setupStatus, signIn, signOut } from './service.ts';

vi.mock('./password.ts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./password.ts')>();
	return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});
const verify = vi.mocked(verifyPassword);
const realVerify = verify.getMockImplementation()!;
beforeEach(() => {
	verify.mockClear();
	verify.mockImplementation(realVerify);
});

const db = createTestDatabase();
const anonymousCtx = testCtx(db);
const as = (actor: UserActor) => testCtx(db, { actor });
let addresses = 0;
const address = () => `10.1.0.${++addresses}`;
const caught = async (promise: Promise<unknown>) =>
	promise.then(
		() => undefined,
		(error) => error
	);

const adminPassword = '  secret phrase  ';
let adminToken: string;

describe('First-run administrator setup', () => {
	it('Setup status is public, and open on an empty installation', () => {
		expect(setupStatus(anonymousCtx)).toEqual({ open: true });
	});

	it('Setup creates the administrator and signs them in, keeping the browser zone', async () => {
		const session = await setup(anonymousCtx, {
			displayName: 'Ana Pérez',
			username: 'Ana.Perez',
			password: adminPassword,
			timeZone: 'America/La_Paz'
		});
		adminToken = session.token;
		const { actor } = resolveActor(anonymousCtx, session.token);
		expect(actor).toMatchObject({
			kind: 'user',
			role: 'admin',
			locale: null,
			timeZone: 'America/La_Paz'
		});
		expect(setupStatus(anonymousCtx)).toEqual({ open: false });
	});

	it('Setup after the first account is refused', async () => {
		const input = { displayName: 'Eve', username: 'eve', password: 'long enough' };
		expect(await caught(setup(anonymousCtx, input))).toBeInstanceOf(Conflict);
		expect(db.select().from(users).all()).toHaveLength(1);
	});

	it('Concurrent setup attempts: exactly one administrator, the other is rejected', async () => {
		const other = createTestDatabase();
		const attempt = (username: string) =>
			caught(setup(testCtx(other), { displayName: username, username, password: 'long enough' }));
		const results = await Promise.all([attempt('first'), attempt('second')]);
		expect(results.filter((error) => error === undefined)).toHaveLength(1);
		expect(results.filter((error) => error instanceof Conflict)).toHaveLength(1);
		expect(other.select().from(users).all()).toHaveLength(1);
	});

	it('creates no administrator when creating the session fails', async () => {
		const other = createTestDatabase();
		other.$client.exec('DROP TABLE sessions');
		const input = { displayName: 'Ana', username: 'ana', password: 'long enough' };
		expect(await caught(setup(testCtx(other), input))).toBeInstanceOf(Error);
		expect(other.select().from(users).all()).toEqual([]);
	});

	it('is refused to a signed-in user', async () => {
		const { actor } = resolveActor(anonymousCtx, adminToken);
		const input = { displayName: 'X', username: 'xavier', password: 'long enough' };
		expect(await caught(setup(testCtx(db, { actor }), input))).toBeInstanceOf(Forbidden);
	});
});

const memberPassword = 'correct horse';
let memberId: number;

describe('Sign-in', () => {
	// Created once setup is done: until then, the installation must be empty.
	beforeAll(async () => {
		memberId = db
			.insert(users)
			.values({
				username: 'luis',
				displayName: 'Luis',
				passwordHash: await hashPassword(memberPassword),
				role: 'member',
				createdAt: new Date()
			})
			.returning()
			.get().id;
	});

	it('Sign-in uses the same normalization: "Ana.Perez" signs into "ana.perez"', async () => {
		const session = await signIn(anonymousCtx, {
			username: ' Ana.Perez ',
			password: adminPassword,
			address: address()
		});
		expect(resolveActor(anonymousCtx, session.token).actor).toMatchObject({ role: 'admin' });
	});

	it('Spaces are significant in the password', async () => {
		const attempt = (password: string) =>
			signIn(anonymousCtx, { username: 'ana.perez', password, address: address() });
		expect(await caught(attempt('secret phrase'))).toBeInstanceOf(Invalid);
		expect(await caught(attempt(adminPassword))).toBeUndefined();
	});

	it('Same response for unknown and existing usernames', async () => {
		const unknown = await caught(
			signIn(anonymousCtx, { username: 'nobody', password: 'wrong pass', address: address() })
		);
		const wrong = await caught(
			signIn(anonymousCtx, { username: 'luis', password: 'wrong pass', address: address() })
		);
		expect(unknown).toBeInstanceOf(Invalid);
		expect(unknown).toEqual(wrong);
		expect((unknown as Invalid).issues).toEqual([
			{ field: '', key: 'auth.sign_in.invalid', params: {} }
		]);
	});

	it('Same work for unknown and existing usernames: one verification with the same parameters', async () => {
		await caught(
			signIn(anonymousCtx, { username: 'nobody2', password: 'wrong pass', address: address() })
		);
		await caught(
			signIn(anonymousCtx, { username: 'luis', password: 'wrong pass', address: address() })
		);
		expect(verify).toHaveBeenCalledTimes(2);
		const parameters = verify.mock.calls.map(([hash]) => hash.split('$').slice(1, 4).join('$'));
		expect(parameters[0]).toBe('argon2id$v=19$m=19456,t=2,p=1');
		expect(parameters[1]).toBe(parameters[0]);
	});

	it('Unknown usernames are throttled too, with the same lockout message', async () => {
		const attempt = (username: string) =>
			caught(signIn(anonymousCtx, { username, password: 'wrong pass', address: address() }));
		for (let i = 0; i < 5; i++) {
			await attempt('ghost');
			await attempt('luis');
		}
		const ghost = await attempt('ghost');
		const luis = await attempt('luis');
		expect(ghost).toBeInstanceOf(Throttled);
		expect(ghost).toEqual(luis);
		expect((ghost as Throttled).params).toEqual({ minutes: 15 });
	});
});

/** Holds every verification until `count` of them are waiting, then lets them all go. */
function barrier(count: number) {
	const waiting: (() => void)[] = [];
	verify.mockImplementation(async (hash, password) => {
		await new Promise<void>((resolve) => {
			waiting.push(resolve);
			if (waiting.length === count) waiting.forEach((release) => release());
		});
		return realVerify(hash, password);
	});
}

describe('Concurrent wrong attempts', () => {
	it.each([1, 2, 3, 4, 5])('count exactly 5 failures and refuse 5 (run %i)', async (run) => {
		barrier(10);
		const from = address();
		const results = await Promise.all(
			Array.from({ length: 10 }, () =>
				caught(
					signIn(anonymousCtx, { username: `target${run}`, password: 'wrong pass', address: from })
				)
			)
		);
		expect(results.filter((error) => error instanceof Invalid)).toHaveLength(5);
		expect(results.filter((error) => error instanceof Throttled)).toHaveLength(5);
	});

	it('Lockout during a pending attempt: the correct password is refused at the second check', async () => {
		let release!: () => void;
		const held = new Promise<void>((resolve) => (release = resolve));
		verify.mockImplementationOnce(async (hash, password) => {
			await held;
			return realVerify(hash, password);
		});
		const pending = caught(
			signIn(anonymousCtx, { username: 'luis', password: memberPassword, address: address() })
		);
		for (let i = 0; i < 5; i++) {
			await caught(
				signIn(anonymousCtx, { username: 'luis', password: 'wrong pass', address: address() })
			);
		}
		release();
		expect(await pending).toBeInstanceOf(Throttled);
	});
});

describe('Time zone from the browser', () => {
	const fresh = async (username: string) => {
		const id = db
			.insert(users)
			.values({
				username,
				displayName: username,
				passwordHash: await hashPassword('long enough'),
				role: 'member',
				createdAt: new Date()
			})
			.returning()
			.get().id;
		return id;
	};
	const zoneAfterSignIn = async (username: string, timeZone: string) => {
		const id = await fresh(username);
		await signIn(anonymousCtx, { username, password: 'long enough', address: address(), timeZone });
		return getProfile(
			testCtx(db, { actor: { kind: 'user', id, role: 'member', locale: null, timeZone: null } }),
			id
		).timeZone;
	};

	it('stores the canonical form of an alias, and UTC as UTC', async () => {
		expect(await zoneAfterSignIn('kolkata', 'Asia/Kolkata')).toBe('Asia/Calcutta');
		expect(await zoneAfterSignIn('utc.user', 'UTC')).toBe('UTC');
	});

	it('Invalid zone reported by the browser: ignored, and sign-in succeeds', async () => {
		expect(await zoneAfterSignIn('offset.user', '+02:00')).toBeNull();
		expect(await zoneAfterSignIn('bogus.user', 'Nowhere/City')).toBeNull();
	});
});

describe('Sessions and sign-out', () => {
	const member = (): UserActor => ({
		kind: 'user',
		id: memberId,
		role: 'member',
		locale: null,
		timeZone: null
	});
	const start = () =>
		signIn(anonymousCtx, { username: 'luis', password: memberPassword, address: address() });

	it('Own sign-out ends only that session', async () => {
		db.delete(sessions).run();
		db.delete(loginAttempts).run();
		const first = await start();
		const second = await start();
		signOut(as(member()), first.token);
		expect(resolveActor(anonymousCtx, first.token)).toMatchObject({
			actor: { kind: 'anonymous' },
			session: { action: 'clear' }
		});
		expect(resolveActor(anonymousCtx, second.token).actor).toMatchObject({
			kind: 'user',
			id: memberId
		});
	});

	it("can't end another user's session", async () => {
		expect(() => signOut(as(member()), adminToken)).toThrow(Forbidden);
		expect(() => signOut(anonymousCtx, adminToken)).toThrow(Forbidden);
	});

	it('Requests cannot act as the application: resolveActor returns a user or anonymous', async () => {
		const { token } = await start();
		const day = 24 * 60 * 60 * 1000;
		expect(resolveActor(anonymousCtx, token)).toMatchObject({
			actor: { kind: 'user' },
			session: { action: 'keep' }
		});

		db.update(sessions)
			.set({ expiresAt: new Date(Date.now() + 28 * day) })
			.run();
		const renewed = resolveActor(anonymousCtx, token);
		expect(renewed.session.action).toBe('renew');

		db.update(sessions)
			.set({ expiresAt: new Date(Date.now() - 1) })
			.run();
		expect(resolveActor(anonymousCtx, token)).toEqual({
			actor: { kind: 'anonymous' },
			session: { action: 'clear' }
		});
		expect(resolveActor(anonymousCtx, undefined)).toEqual({
			actor: { kind: 'anonymous' },
			session: { action: 'keep' }
		});
		expect(resolveActor(testCtx(db, { actor: systemActor('test') }), 'x').actor.kind).not.toBe(
			'system'
		);
	});
});
