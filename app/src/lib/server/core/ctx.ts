// What every service function receives first (D16): the database, who is acting, the locale,
// and whether a transaction is already open (withTransaction joins it).
import type { Db } from '../db/client.ts';
import { anonymous, type Actor } from './actor.ts';

export interface Ctx {
	db: Db;
	actor: Actor;
	locale: string;
	inTransaction: boolean;
}

/** A ctx for tests: anonymous and English unless overridden. */
export function testCtx(db: Db, overrides: Partial<Omit<Ctx, 'db'>> = {}): Ctx {
	return { db, actor: anonymous, locale: 'en', inTransaction: false, ...overrides };
}
