// Dictionaries built from the committed catalogs (D14). Task 5.2 moves the installed languages and
// their translations to the database, with the seed, fallback chain, staleness and authorization.
import { parse } from '@formatjs/icu-messageformat-parser';
import { createHash } from 'node:crypto';
import en from '../../../../../messages/en.json' with { type: 'json' };
import es from '../../../../../messages/es.json' with { type: 'json' };

type Catalog = Record<string, { text: string }>;

const catalogs: Record<string, Catalog> = { en, es };

export interface BuiltDictionary {
	locale: string;
	url: string;
	/** Parsed messages, serialized as the dictionary file. */
	body: string;
	messages: Record<string, ReturnType<typeof parse>>;
}

const built = new Map<string, BuiltDictionary>();

export function listInstalled(): string[] {
	return Object.keys(catalogs);
}

/** The locale's messages, parsed once, with English filling any missing text. */
export function getDictionary(locale: string): BuiltDictionary {
	let dictionary = built.get(locale);
	if (!dictionary) {
		const catalog = catalogs[locale] ?? {};
		const messages = Object.fromEntries(
			Object.entries(en as Catalog).map(([key, english]) => [
				key,
				parse(catalog[key]?.text ?? english.text)
			])
		);
		const body = JSON.stringify(messages);
		const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
		dictionary = { locale, url: `/i18n/${locale}.${hash}.json`, body, messages };
		built.set(locale, dictionary);
	}
	return dictionary;
}

/** The dictionary served at /i18n/<file>, when <file> names the current version of an installed locale. */
export function getDictionaryFile(file: string): BuiltDictionary | undefined {
	const locale = /^(.+)\.[0-9a-f]{16}\.json$/.exec(file)?.[1];
	if (!locale || !(locale in catalogs)) return undefined;
	const dictionary = getDictionary(locale);
	return dictionary.url === `/i18n/${file}` ? dictionary : undefined;
}
