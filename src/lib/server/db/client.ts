// The SQLite connection (D3): one better-sqlite3 handle per process, wrapped by Drizzle.
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as schema from './schema.ts';

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

export function openDatabase(file: string): Db {
	mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
	const client = new Database(file);
	client.pragma('journal_mode = WAL');
	client.pragma('foreign_keys = ON');
	client.pragma('busy_timeout = 5000');
	client.pragma('synchronous = NORMAL');
	return drizzle({ client, schema });
}
