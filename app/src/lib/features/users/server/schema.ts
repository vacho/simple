import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Server-only accounts, so server-generated IDs are fine (D15).
export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	/** Normalized (D4) and unique. */
	username: text('username').notNull().unique(),
	displayName: text('display_name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'member'] }).notNull(),
	/** NULL means "browser default" (D14). */
	locale: text('locale'),
	/** Canonical IANA zone; NULL means UTC (ADR 0021). */
	timeZone: text('time_zone'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});
