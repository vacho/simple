import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import path from 'node:path';
import type { Db } from './client.ts';

/** Generated migrations, committed in drizzle/ at the app root; the app runs from that directory. */
export const migrationsFolder = path.resolve('drizzle');

export function runMigrations(db: Db, folder = migrationsFolder): void {
	migrate(db, { migrationsFolder: folder });
}

/** Whether the database already holds tables, as opposed to a new, empty file. */
export function hasSchema(db: Db): boolean {
	return (
		db.$client
			.prepare(
				"SELECT 1 FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'"
			)
			.get() !== undefined
	);
}

/** Whether runMigrations would apply anything: Drizzle's own rule, by migration timestamp. */
export function hasPendingMigrations(db: Db, folder = migrationsFolder): boolean {
	const migrations = readMigrationFiles({ migrationsFolder: folder });
	const recorded = db.$client
		.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
		.get();
	if (!recorded) return migrations.length > 0;
	const last = db.$client
		.prepare('SELECT max(created_at) FROM __drizzle_migrations')
		.pluck()
		.get() as number | null;
	return migrations.some((migration) => last === null || migration.folderMillis > Number(last));
}
