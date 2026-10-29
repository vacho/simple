// Sessions (D4, Lucia/Oslo pattern): the cookie carries a random token; only its SHA-256 is
// stored, so a leaked database leaks no live session. A session expires between 29 and 30 days
// after its last use: validation extends it to 30 days once fewer than 29 remain, so it writes
// at most once a day per session.
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import type { UserActor } from '../../../server/core/actor.ts';
import type { Ctx } from '../../../server/core/ctx.ts';
import type { SessionResult } from '../../../server/core/session.ts';
import { findSessionWithUser } from './queries.ts';
import * as repo from './repo.ts';

type Db = Ctx['db'];

const day = 24 * 60 * 60 * 1000;
export const sessionLifetime = 30 * day;
const renewBelow = 29 * day;

export function generateSessionToken(): string {
	return encodeBase32LowerCaseNoPadding(crypto.getRandomValues(new Uint8Array(20)));
}

const sessionId = (token: string) => encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

export function createSession(db: Db, token: string, userId: number, now: number): Date {
	const expiresAt = new Date(now + sessionLifetime);
	repo.insertSession(db, { id: sessionId(token), userId, expiresAt });
	return expiresAt;
}

export type Validation =
	| { user: UserActor; session: Extract<SessionResult, { action: 'keep' | 'renew' }> }
	| { user: undefined; session: Extract<SessionResult, { action: 'clear' }> };

export function validateSession(db: Db, token: string, now: number): Validation {
	const id = sessionId(token);
	const found = findSessionWithUser(db, id);
	if (!found || found.expiresAt.getTime() <= now) {
		if (found) repo.deleteSession(db, id);
		return { user: undefined, session: { action: 'clear' } };
	}
	const user: UserActor = { kind: 'user', ...found.user };
	if (found.expiresAt.getTime() - now >= renewBelow) return { user, session: { action: 'keep' } };
	const expiresAt = new Date(now + sessionLifetime);
	repo.setSessionExpiry(db, id, expiresAt);
	return { user, session: { action: 'renew', expiresAt } };
}

/** The user a session token belongs to, if the session exists. */
export function sessionOwner(db: Db, token: string): number | undefined {
	return findSessionWithUser(db, sessionId(token))?.user.id;
}

export function invalidateSession(db: Db, token: string): void {
	repo.deleteSession(db, sessionId(token));
}
