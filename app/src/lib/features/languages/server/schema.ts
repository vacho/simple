import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Installed languages (D14): "installed" means status = active. English is built in.
export const languages = sqliteTable('languages', {
	/** BCP 47 code. */
	code: text('code').primaryKey(),
	status: text('status', { enum: ['active', 'inactive'] }).notNull(),
	preinstalled: integer('preinstalled', { mode: 'boolean' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export const translations = sqliteTable(
	'translations',
	{
		locale: text('locale')
			.notNull()
			.references(() => languages.code, { onDelete: 'cascade' }),
		key: text('key').notNull(),
		value: text('value').notNull(),
		origin: text('origin', { enum: ['seed', 'ai', 'human'] }).notNull(),
		/** Hash of the English text this translates; a different hash marks it stale. */
		sourceHash: text('source_hash').notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [primaryKey({ columns: [table.locale, table.key] })]
);
