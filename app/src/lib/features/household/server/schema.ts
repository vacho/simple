import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from '../../users/server/schema.ts';

export const baseClasses = ['adult', 'minor', 'dependent'] as const;

// The one household (D1): created by the first rename, so a missing row means "unnamed".
export const household = sqliteTable(
	'household',
	{
		id: integer('id').primaryKey(),
		name: text('name'),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [check('household_single_row', sql`${table.id} = 1`)]
);

// Household data: UUIDv7 IDs a device may generate, creates idempotent by ID (ADR 0007).
export const memberTypes = sqliteTable('member_types', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	/** The name trimmed, NFKC and lowercased: uniqueness ignoring case in any script (D1). */
	nameKey: text('name_key').notNull().unique(),
	baseClass: text('base_class', { enum: baseClasses }).notNull(),
	archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export const members = sqliteTable(
	'members',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		nameKey: text('name_key').notNull().unique(),
		memberTypeId: text('member_type_id')
			.notNull()
			.references(() => memberTypes.id),
		/** One account per member and one member per account (ADR 0026). */
		userId: integer('user_id')
			.unique()
			.references(() => users.id),
		/** Set on the first link and never cleared: a member ever linked is archived, not deleted. */
		firstLinkedAt: integer('first_linked_at', { mode: 'timestamp_ms' }),
		archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('members_member_type_id_idx').on(table.memberTypeId)]
);
