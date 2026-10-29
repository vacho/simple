// All access to the languages and translations tables.
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../../server/db/client.ts';
import { languages, translations } from './schema.ts';

export function listActiveCodes(db: Db): string[] {
	return db
		.select({ code: languages.code })
		.from(languages)
		.where(eq(languages.status, 'active'))
		.all()
		.map((row) => row.code);
}

export function listTranslations(db: Db, locale: string) {
	return db
		.select({
			key: translations.key,
			value: translations.value,
			sourceHash: translations.sourceHash
		})
		.from(translations)
		.where(eq(translations.locale, locale))
		.all();
}

/** Adds a preinstalled language as active; an existing row is left as it is. */
export function ensurePreinstalled(db: Db, code: string, now: Date): void {
	db.insert(languages)
		.values({ code, status: 'active', preinstalled: true, createdAt: now })
		.onConflictDoNothing()
		.run();
}

/** Writes seed texts; rows edited later (origin ai or human) are never overwritten. */
export function upsertSeedTranslations(
	db: Db,
	locale: string,
	rows: { key: string; value: string; sourceHash: string }[],
	now: Date
): void {
	for (const row of rows) {
		db.insert(translations)
			.values({ locale, ...row, origin: 'seed', updatedAt: now })
			.onConflictDoUpdate({
				target: [translations.locale, translations.key],
				set: { value: row.value, sourceHash: row.sourceHash, updatedAt: now },
				setWhere: eq(translations.origin, 'seed')
			})
			.run();
	}
}

/** Changes whenever another connection commits; ours are invalidated explicitly. */
export function dataVersion(db: Db): number {
	return db.get<{ data_version: number }>(sql`PRAGMA data_version`).data_version;
}
