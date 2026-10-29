// Installed languages and their dictionaries (D14). Languages are app data: installing one in
// the database makes it available without code changes, a rebuild or a restart.
import { createHash } from 'node:crypto';
import type { Ctx } from '../../../server/core/ctx.ts';
import { sourceHash } from '../../../server/core/source-hash.ts';
import { withTransaction } from '../../../server/core/transaction.ts';
import { authorize } from '../../../server/policy/policy.ts';
import en from '../../../../../messages/en.json' with { type: 'json' };
import es from '../../../../../messages/es.json' with { type: 'json' };
import { compile, isCompatible, type Compiled } from './compile.ts';
import { pseudoLocale, pseudolocalize } from './pseudo.ts';
import * as repo from './repo.ts';

export interface Dictionary {
	locale: string;
	/** /i18n/<locale>.<content-hash>.json: changes whenever the content does. */
	url: string;
	/** Compiled messages, fallback chain applied, for every English key. */
	messages: Record<string, Compiled>;
	/** The served file: the messages as JSON. */
	body: string;
	/** Keys whose translation in this locale was made from an older English text. */
	stale: string[];
}

const english = Object.fromEntries(
	Object.entries(en as Record<string, { text: string }>).map(([key, { text }]) => [
		key,
		{ text, compiled: compile(text), hash: sourceHash(text) }
	])
);

type Db = Ctx['db'];

interface Cache {
	version: number;
	installed: string[];
	dictionaries: Map<string, Dictionary>;
}

// Keyed by database, so tests with several temporary databases never share entries (D5).
const caches = new WeakMap<Db, Cache>();
// Databases whose server started with the pseudo-locale on; never stored, so a restart without
// the flag has no en-XA.
const withPseudoLocale = new WeakSet<Db>();

function cache(db: Db): Cache {
	const version = repo.dataVersion(db);
	let entry = caches.get(db);
	if (!entry || entry.version !== version) {
		const installed = new Set(['en', ...repo.listActiveCodes(db)]);
		if (withPseudoLocale.has(db)) installed.add(pseudoLocale);
		entry = { version, installed: [...installed].sort(), dictionaries: new Map() };
		caches.set(db, entry);
	}
	return entry;
}

const invalidate = (db: Db) => caches.delete(db);

/** The installed locales a text may come from: the locale, its installed parents, then English. */
function chain(locale: string, installed: string[]): string[] {
	const subtags = locale.split('-');
	const candidates = subtags.map((_, index) => subtags.slice(0, subtags.length - index).join('-'));
	return [...candidates.filter((code) => code !== 'en' && installed.includes(code)), 'en'];
}

function serve(locale: string, messages: Record<string, Compiled>, stale: string[]): Dictionary {
	const body = JSON.stringify(messages);
	const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
	return { locale, url: `/i18n/${locale}.${hash}.json`, messages, body, stale };
}

function build(db: Db, locale: string, installed: string[]): Dictionary {
	if (locale === pseudoLocale) {
		const pseudo = Object.entries(english).map(([key, { compiled }]) => [
			key,
			pseudolocalize(compiled)
		]);
		return serve(locale, Object.fromEntries(pseudo), []);
	}
	const translationsByLocale = new Map(
		chain(locale, installed)
			.filter((code) => code !== 'en')
			.map((code) => [code, new Map(repo.listTranslations(db, code).map((row) => [row.key, row]))])
	);
	const stale: string[] = [];
	const messages: Record<string, Compiled> = {};
	for (const [key, source] of Object.entries(english)) {
		messages[key] = source.compiled;
		for (const [code, rows] of translationsByLocale) {
			const row = rows.get(key);
			if (!row) continue;
			const isStale = row.sourceHash !== source.hash;
			if (isStale && code === locale) stale.push(key);
			let compiled: Compiled;
			try {
				compiled = compile(row.value);
			} catch {
				continue;
			}
			// A stale text whose arguments no longer match English would fail to render.
			if (isStale && !isCompatible(compiled, source.compiled)) continue;
			messages[key] = compiled;
			break;
		}
	}
	return serve(locale, messages, stale);
}

export function listInstalled(ctx: Ctx): string[] {
	authorize(ctx.actor, 'languages.read');
	return cache(ctx.db).installed;
}

/** The dictionary of an installed locale; English for any other. */
export function getDictionary(ctx: Ctx, locale: string): Dictionary {
	authorize(ctx.actor, 'languages.read');
	const entry = cache(ctx.db);
	const code = entry.installed.includes(locale) ? locale : 'en';
	let dictionary = entry.dictionaries.get(code);
	if (!dictionary) {
		dictionary = build(ctx.db, code, entry.installed);
		entry.dictionaries.set(code, dictionary);
	}
	return dictionary;
}

/** The dictionary served at /i18n/<file>, when <file> names the current version of an installed locale. */
export function getDictionaryFile(ctx: Ctx, file: string): Dictionary | undefined {
	authorize(ctx.actor, 'languages.read');
	const locale = /^(.+)\.[0-9a-f]{16}\.json$/.exec(file)?.[1];
	if (!locale || !cache(ctx.db).installed.includes(locale)) return undefined;
	const dictionary = getDictionary(ctx, locale);
	return dictionary.url === `/i18n/${file}` ? dictionary : undefined;
}

/**
 * Startup: installs English and Spanish and writes the reviewed Spanish texts (origin seed).
 * With pseudoLocale, en-XA is installed too, for this run only.
 */
export function seed(ctx: Ctx, { pseudoLocale = false, now = new Date() } = {}): void {
	authorize(ctx.actor, 'languages.seed');
	if (pseudoLocale) withPseudoLocale.add(ctx.db);
	else withPseudoLocale.delete(ctx.db);
	const rows = Object.entries(es as Record<string, { text: string; source: string }>).map(
		([key, entry]) => ({ key, value: entry.text, sourceHash: entry.source })
	);
	withTransaction(ctx, (tx) => {
		repo.ensurePreinstalled(tx.db, 'en', now);
		repo.ensurePreinstalled(tx.db, 'es', now);
		repo.upsertSeedTranslations(tx.db, 'es', rows, now);
	});
	invalidate(ctx.db);
}
