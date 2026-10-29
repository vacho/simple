// The startup sequence (D3), run once from the init hook before the first request is served.
// Any failure stops startup: adapter-node never starts listening.
import { seed } from '../features/languages/server/index.ts';
import { systemActor } from './core/actor.ts';
import { openDatabase, type Db } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';

export interface StartupOptions {
	databasePath: string;
	migrationsFolder?: string;
	/** Installs the en-XA pseudo-locale for this run (I18N_PSEUDO=1); a testing aid only. */
	pseudoLocale?: boolean;
}

export function startup({ databasePath, migrationsFolder, pseudoLocale }: StartupOptions): Db {
	if (pseudoLocale) console.warn('I18N_PSEUDO is set: the en-XA pseudo-locale is installed.');
	const db = openDatabase(databasePath);
	try {
		runMigrations(db, migrationsFolder);
		const ctx = {
			db,
			actor: systemActor('startup: language seed'),
			locale: 'en',
			inTransaction: false
		};
		seed(ctx, { pseudoLocale });
	} catch (error) {
		db.$client.close();
		throw error;
	}
	return db;
}
