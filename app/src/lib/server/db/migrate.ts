import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import type { Db } from './client.ts';

/** Generated migrations, committed in drizzle/ at the app root; the app runs from that directory. */
export const migrationsFolder = path.resolve('drizzle');

export function runMigrations(db: Db, folder = migrationsFolder): void {
	migrate(db, { migrationsFolder: folder });
}
