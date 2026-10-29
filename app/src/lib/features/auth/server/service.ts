// Setup, sign-in, sign-out and session resolution (D4, D5). Use cases do their async work first
// (hashing, token generation), then short synchronous transactions, and see no HTTP types.
import type { Ctx } from '../../../server/core/ctx.ts';
import {
	anonymous,
	systemActor,
	type AnonymousActor,
	type UserActor
} from '../../../server/core/actor.ts';
import { Conflict, Forbidden, Invalid, Throttled } from '../../../server/core/errors.ts';
import type { SessionResult } from '../../../server/core/session.ts';
import { withTransaction } from '../../../server/core/transaction.ts';
import { parseInput } from '../../../server/core/validation.ts';
import { authorize } from '../../../server/policy/policy.ts';
import {
	createAdmin,
	getCredentialsForSignIn,
	hasAnyUser,
	updateProfile
} from '../../users/server/index.ts';
import { canonicalTimeZone, newAccount, normalizeUsername } from '../../users/validation.ts';
import { dummyHash, hashPassword, verifyPassword } from './password.ts';
import {
	createSession,
	generateSessionToken,
	invalidateSession,
	sessionOwner,
	validateSession
} from './session.ts';
import { lockedUntil, recordFailure, recordSuccess } from './throttle.ts';

type Db = Ctx['db'];

export interface NewSession {
	token: string;
	expiresAt: Date;
}

const asSystem = (ctx: Ctx, reason: string): Ctx => ({ ...ctx, actor: systemActor(reason) });
const browserZone = (value: unknown) =>
	typeof value === 'string' ? (canonicalTimeZone(value) ?? null) : null;

// Users can't go back to zero in this change, so once setup is closed it stays closed. Keyed by
// database, so an empty test database never looks set up (D5).
const setupClosed = new WeakSet<Db>();

export function setupStatus(ctx: Ctx): { open: boolean } {
	authorize(ctx.actor, 'auth.setupStatus');
	if (!setupClosed.has(ctx.db) && hasAnyUser(asSystem(ctx, 'setup status')))
		setupClosed.add(ctx.db);
	return { open: !setupClosed.has(ctx.db) };
}

/**
 * First-run setup: the administrator and their session are created together, or not at all.
 * The browser's time zone is kept when valid; the language is left to the browser.
 */
export async function setup(ctx: Ctx, input: Record<string, unknown>): Promise<NewSession> {
	authorize(ctx.actor, 'auth.setup');
	const account = parseInput(newAccount, input);
	const passwordHash = await hashPassword(account.password);
	const token = generateSessionToken();
	const timeZone = browserZone(input.timeZone);
	return withTransaction(ctx, (tx) => {
		const system = asSystem(tx, 'setup');
		// Re-checked inside the write transaction: concurrent setups create one administrator.
		if (hasAnyUser(system)) throw new Conflict('auth.setup.closed');
		const userId = createAdmin(system, { ...account, passwordHash, timeZone });
		return { token, expiresAt: createSession(tx.db, token, userId, Date.now()) };
	});
}

export interface SignInInput {
	username: string;
	password: string;
	/** The client address, for the per-address counter. */
	address: string;
	/** IANA zone reported by the browser; stored when the account has none. */
	timeZone?: string;
}

type Outcome =
	| { status: 'ok'; session: NewSession }
	| { status: 'invalid' }
	| { status: 'throttled'; until: Date };

const minutesUntil = (until: Date) =>
	Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));

/**
 * Sign-in without account enumeration (D4): unknown and existing usernames cost one password
 * verification each and get the same answers. Failures are returned from the transaction and
 * thrown only after it commits, so a counted failure is never rolled back.
 */
export async function signIn(ctx: Ctx, input: SignInInput): Promise<NewSession> {
	authorize(ctx.actor, 'auth.signIn');
	const username = normalizeUsername(input.username);
	const password = input.password.normalize('NFKC');
	const system = asSystem(ctx, 'sign-in');

	const first = withTransaction(system, (tx) => {
		const until = lockedUntil(tx.db, username, input.address, Date.now());
		return until
			? { locked: true as const, until }
			: { locked: false as const, credentials: getCredentialsForSignIn(tx, username) };
	});
	if (first.locked) {
		throw new Throttled('auth.sign_in.locked', { minutes: minutesUntil(first.until) });
	}

	// Outside any transaction: Argon2 is slow and async.
	const { credentials } = first;
	const matches = await verifyPassword(credentials?.passwordHash ?? (await dummyHash), password);
	const token = generateSessionToken();

	const outcome = withTransaction(system, (tx): Outcome => {
		const now = Date.now();
		// Concurrent attempts may have locked the username while the hash was being checked.
		const until = lockedUntil(tx.db, username, input.address, now);
		if (until) return { status: 'throttled', until };
		if (!credentials || !matches) {
			recordFailure(tx.db, username, input.address, now);
			return { status: 'invalid' };
		}
		recordSuccess(tx.db, username);
		const expiresAt = createSession(tx.db, token, credentials.id, now);
		const timeZone = browserZone(input.timeZone);
		if (credentials.timeZone === null && timeZone) {
			// The user has just proven who they are: they update their own profile.
			const user: UserActor = { kind: 'user', ...credentials };
			updateProfile({ ...tx, actor: user }, credentials.id, { timeZone });
		}
		return { status: 'ok', session: { token, expiresAt } };
	});

	if (outcome.status === 'throttled') {
		throw new Throttled('auth.sign_in.locked', { minutes: minutesUntil(outcome.until) });
	}
	if (outcome.status === 'invalid') {
		throw new Invalid([{ field: '', key: 'auth.sign_in.invalid', params: {} }]);
	}
	return outcome.session;
}

/** Ends the caller's own session, and only that one. */
export function signOut(ctx: Ctx, token: string): void {
	authorize(ctx.actor, 'auth.signOut');
	const { actor } = ctx;
	withTransaction(asSystem(ctx, 'sign-out'), (tx) => {
		if (actor.kind !== 'user' || sessionOwner(tx.db, token) !== actor.id) throw new Forbidden();
		invalidateSession(tx.db, token);
	});
}

/**
 * The actor of a request (D5): the signed-in user for a valid session, anonymous otherwise,
 * never the application. The session result says what to do with the cookie.
 */
export function resolveActor(
	ctx: Ctx,
	token: string | undefined
): { actor: UserActor | AnonymousActor; session: SessionResult } {
	const system = asSystem(ctx, 'session validation');
	authorize(system.actor, 'auth.validateSession');
	if (!token) return { actor: anonymous, session: { action: 'keep' } };
	const { user, session } = withTransaction(system, (tx) =>
		validateSession(tx.db, token, Date.now())
	);
	return { actor: user ?? anonymous, session };
}
