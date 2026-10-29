// All access to the sessions and login_attempts tables.
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../../server/db/client.ts';
import { loginAttempts, sessions } from './schema.ts';

export type AttemptKind = (typeof loginAttempts.$inferSelect)['kind'];
export type Attempt = typeof loginAttempts.$inferSelect;

export function insertSession(db: Db, session: typeof sessions.$inferInsert): void {
	db.insert(sessions).values(session).run();
}

export function setSessionExpiry(db: Db, id: string, expiresAt: Date): void {
	db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id)).run();
}

export function deleteSession(db: Db, id: string): void {
	db.delete(sessions).where(eq(sessions.id, id)).run();
}

const attemptKey = (kind: AttemptKind, key: string) =>
	and(eq(loginAttempts.kind, kind), eq(loginAttempts.key, key));

export function findAttempt(db: Db, kind: AttemptKind, key: string): Attempt | undefined {
	return db.select().from(loginAttempts).where(attemptKey(kind, key)).get();
}

export function saveAttempt(db: Db, attempt: Attempt): void {
	db.insert(loginAttempts)
		.values(attempt)
		.onConflictDoUpdate({
			target: [loginAttempts.kind, loginAttempts.key],
			set: {
				failures: attempt.failures,
				windowStart: attempt.windowStart,
				lockedUntil: attempt.lockedUntil
			}
		})
		.run();
}

export function deleteAttempt(db: Db, kind: AttemptKind, key: string): void {
	db.delete(loginAttempts).where(attemptKey(kind, key)).run();
}
