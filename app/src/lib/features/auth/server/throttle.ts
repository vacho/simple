// Sign-in throttling (D4), per normalized username (whether or not the account exists) and per
// client address. Counters live in SQLite, so they survive restarts. Callers check the lock
// first: attempts refused while locked are neither counted nor extend the lock.
import type { Ctx } from '../../../server/core/ctx.ts';
import * as repo from './repo.ts';

type Db = Ctx['db'];

const minute = 60 * 1000;
export const throttleWindow = 15 * minute;
export const lockDuration = 15 * minute;
// 5 is enough for honest typos; 20 per address, because a household shares one router address.
const limits: Record<repo.AttemptKind, number> = { username: 5, address: 20 };

/** When the later of the two locks ends, or undefined when neither is locked. */
export function lockedUntil(
	db: Db,
	username: string,
	address: string,
	now: number
): Date | undefined {
	const locks = [
		repo.findAttempt(db, 'username', username),
		repo.findAttempt(db, 'address', address)
	]
		.map((attempt) => attempt?.lockedUntil?.getTime() ?? 0)
		.filter((until) => until > now);
	return locks.length > 0 ? new Date(Math.max(...locks)) : undefined;
}

function countFailure(db: Db, kind: repo.AttemptKind, key: string, now: number): void {
	const attempt = repo.findAttempt(db, kind, key);
	const fresh =
		!attempt ||
		now - attempt.windowStart.getTime() >= throttleWindow ||
		(attempt.lockedUntil !== null && attempt.lockedUntil.getTime() <= now);
	const failures = (fresh ? 0 : attempt.failures) + 1;
	repo.saveAttempt(db, {
		kind,
		key,
		failures,
		windowStart: fresh ? new Date(now) : attempt.windowStart,
		lockedUntil: failures >= limits[kind] ? new Date(now + lockDuration) : null
	});
}

/** A wrong password while neither the username nor the address is locked. */
export function recordFailure(db: Db, username: string, address: string, now: number): void {
	countFailure(db, 'username', username, now);
	countFailure(db, 'address', address, now);
}

/** A success resets only the username: never the address, which an attacker could otherwise reset. */
export function recordSuccess(db: Db, username: string): void {
	repo.deleteAttempt(db, 'username', username);
}
