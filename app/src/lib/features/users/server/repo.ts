// All access to the users table.
import { and, asc, count, eq, ne, sql } from 'drizzle-orm';
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
		.select({
			...profileColumns,
			passwordHash: users.passwordHash,
			active: users.active,
			passwordTemporary: users.passwordTemporary
		})
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

/** Every account, for the administrators' accounts page; never the password hash. */
export function listAccounts(db: Db) {
	return db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			role: users.role,
			active: users.active,
			passwordTemporary: users.passwordTemporary
		})
		.from(users)
		.orderBy(asc(users.username))
		.all();
}

export function findAccountState(db: Db, id: number) {
	return db
		.select({ role: users.role, active: users.active })
		.from(users)
		.where(eq(users.id, id))
		.get();
}

/** Active administrators other than this account. */
export function otherActiveAdmins(db: Db, id: number): number {
	return db
		.select({ count: count() })
		.from(users)
		.where(and(eq(users.role, 'admin'), eq(users.active, true), ne(users.id, id)))
		.get()!.count;
}

export function updateAccount(
	db: Db,
	id: number,
	changes: Partial<Pick<NewUser, 'role' | 'active' | 'passwordHash' | 'passwordTemporary'>>
): void {
	db.update(users).set(changes).where(eq(users.id, id)).run();
}
