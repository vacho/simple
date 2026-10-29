// All access to the users table.
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../../server/db/client.ts';
import { users } from './schema.ts';

type NewUser = typeof users.$inferInsert;

const profileColumns = {
	id: users.id,
	username: users.username,
	displayName: users.displayName,
	role: users.role,
	locale: users.locale,
	timeZone: users.timeZone
};

export function insertUser(db: Db, user: NewUser): number {
	return db.insert(users).values(user).returning({ id: users.id }).get().id;
}

export function usernameExists(db: Db, username: string): boolean {
	return (
		db.select({ id: users.id }).from(users).where(eq(users.username, username)).get() !== undefined
	);
}

export function findCredentials(db: Db, username: string) {
	return db
		.select({ ...profileColumns, passwordHash: users.passwordHash })
		.from(users)
		.where(eq(users.username, username))
		.get();
}

export function findProfile(db: Db, id: number) {
	return db.select(profileColumns).from(users).where(eq(users.id, id)).get();
}

/** Returns false when the user doesn't exist. */
export function updateProfile(
	db: Db,
	id: number,
	changes: Partial<Pick<NewUser, 'locale' | 'timeZone'>>
): boolean {
	return db.update(users).set(changes).where(eq(users.id, id)).run().changes > 0;
}

export function anyUser(db: Db): boolean {
	return (
		db.get<{ found: number }>(sql`SELECT EXISTS (SELECT 1 FROM ${users}) AS found`).found === 1
	);
}
