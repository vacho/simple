// Session validation reads the session with its user: a read across features (ADR 0008).
import { eq } from 'drizzle-orm';
import type { Db } from '../../../server/db/client.ts';
import { users } from '../../users/server/schema.ts';
import { sessions } from './schema.ts';

export function findSessionWithUser(db: Db, sessionId: string) {
	return db
		.select({
			expiresAt: sessions.expiresAt,
			user: { id: users.id, role: users.role, locale: users.locale, timeZone: users.timeZone }
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.get();
}
