import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from '../../users/server/schema.ts';

export const sessions = sqliteTable(
	'sessions',
	{
		/** SHA-256 of the session token; the token itself is never stored (D4). */
		id: text('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('sessions_user_id_idx').on(table.userId)]
);

// Failed sign-in counters, one row per normalized username and per client address (D4).
export const loginAttempts = sqliteTable(
	'login_attempts',
	{
		kind: text('kind', { enum: ['username', 'address'] }).notNull(),
		key: text('key').notNull(),
		failures: integer('failures').notNull(),
		windowStart: integer('window_start', { mode: 'timestamp_ms' }).notNull(),
		lockedUntil: integer('locked_until', { mode: 'timestamp_ms' })
	},
	(table) => [primaryKey({ columns: [table.kind, table.key] })]
);
