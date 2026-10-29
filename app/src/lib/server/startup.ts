// The startup sequence (D3), run once from the init hook before the first request is served.
// Any failure stops startup: adapter-node never starts listening.
import { openDatabase, type Db } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';

export interface StartupOptions {
	databasePath: string;
	migrationsFolder?: string;
}

export function startup({ databasePath, migrationsFolder }: StartupOptions): Db {
	const db = openDatabase(databasePath);
	try {
		runMigrations(db, migrationsFolder);
	} catch (error) {
		db.$client.close();
		throw error;
	}
	return db;
}
