// The startup sequence (D3), run once from the init hook before the first request is served:
// open the database, back it up when migrations are pending on an existing schema, migrate, and
// seed the preinstalled languages. Any failure stops startup: adapter-node never starts listening.
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { seed } from '../features/languages/server/index.ts';
import { systemActor } from './core/actor.ts';
import { backupDatabase, backupFileName } from './db/backup.ts';
import { openDatabase, type Db } from './db/client.ts';
import { hasPendingMigrations, hasSchema, migrationsFolder, runMigrations } from './db/migrate.ts';

export interface StartupOptions {
	databasePath: string;
	/** Where the pre-migration backup is written (BACKUP_DIR). */
	backupDir: string;
	/** The app version the migrations bring the schema to, for the backup's name. */
	version: string;
	migrationsFolder?: string;
	/** Installs the en-XA pseudo-locale for this run (I18N_PSEUDO=1); a testing aid only. */
	pseudoLocale?: boolean;
}

const keptPreMigrationBackups = 3;
const preMigration = /^pre-migrate-.+-(\d{8}T\d{6}Z)\.db$/;

/** Before an upgrade: a verified copy, and only the newest three such copies kept (D8). */
function backUpBeforeMigrating(databasePath: string, backupDir: string, version: string): void {
	mkdirSync(backupDir, { recursive: true });
	const target = path.join(backupDir, backupFileName(`pre-migrate-${version}`, new Date()));
	backupDatabase(databasePath, target);
	const older = readdirSync(backupDir)
		.filter((name) => preMigration.test(name))
		.sort((a, b) => a.match(preMigration)![1].localeCompare(b.match(preMigration)![1]))
		.slice(0, -keptPreMigrationBackups);
	for (const name of older) {
		try {
			unlinkSync(path.join(backupDir, name));
		} catch (error) {
			// The new backup exists; an old one left behind doesn't block the upgrade.
			console.warn(`Could not delete the old pre-migration backup ${name}:`, error);
		}
	}
	console.log(`Pre-migration backup written: ${target}`);
}

export function startup(options: StartupOptions): Db {
	const folder = options.migrationsFolder ?? migrationsFolder;
	if (options.pseudoLocale)
		console.warn('I18N_PSEUDO is set: the en-XA pseudo-locale is installed.');
	const db = openDatabase(options.databasePath);
	try {
		// A new, empty database has nothing to lose: it is migrated without a backup.
		if (hasSchema(db) && hasPendingMigrations(db, folder)) {
			backUpBeforeMigrating(options.databasePath, options.backupDir, options.version);
		}
		runMigrations(db, folder);
		const ctx = {
			db,
			actor: systemActor('startup: language seed'),
			locale: 'en',
			inTransaction: false
		};
		seed(ctx, { pseudoLocale: options.pseudoLocale });
	} catch (error) {
		db.$client.close();
		throw error;
	}
	return db;
}
