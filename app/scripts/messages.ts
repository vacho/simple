// The message catalogs (D14): messages/en.json, the English source with a description per text,
// and messages/<locale>.json, translations with the hash of the English text they translate.
// Shared by gen-messages, check-messages, i18n-status and i18n-sort.
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sourceHash } from '../src/lib/server/core/source-hash.ts';

export const appRoot = path.resolve(import.meta.dirname, '..');
export const messagesDir = path.join(appRoot, 'messages');
export const featuresDir = path.join(appRoot, 'src/lib/features');

/** Key prefixes every feature may share; features add their folder name. */
export const sharedPrefixes = ['common', 'shell', 'offline', 'validation', 'errors'];

export interface EnglishEntry {
	text: string;
	description: string;
}

export interface TranslationEntry {
	text: string;
	source: string;
}

export type Catalog<T> = Record<string, T>;

export function readCatalog<T>(dir: string, locale: string): Catalog<T> {
	return JSON.parse(readFileSync(path.join(dir, `${locale}.json`), 'utf8')) as Catalog<T>;
}

export function writeCatalog(dir: string, locale: string, catalog: Catalog<unknown>): void {
	writeFileSync(path.join(dir, `${locale}.json`), `${JSON.stringify(catalog, null, '\t')}\n`);
}

/** Locales with a translation catalog, English excluded. */
export function translationLocales(dir: string): string[] {
	return readdirSync(dir)
		.filter((file) => file.endsWith('.json') && file !== 'en.json')
		.map((file) => file.slice(0, -'.json'.length))
		.sort();
}

export function featureNames(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

/** The arguments a message takes, by name, with their ICU kind. */
export function argumentsOf(text: string): Map<string, TYPE> {
	const found = new Map<string, TYPE>();
	const walk = (elements: MessageFormatElement[]) => {
		for (const element of elements) {
			if (element.type !== TYPE.literal && element.type !== TYPE.pound) {
				found.set(element.value, element.type);
			}
			if ('options' in element) {
				for (const option of Object.values(element.options)) walk(option.value);
			}
			if (element.type === TYPE.tag) walk(element.children);
		}
	};
	walk(parse(text));
	return found;
}

export const byKey = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function sortCatalog<T>(catalog: Catalog<T>): Catalog<T> {
	return Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => byKey(a, b)));
}

const sameArguments = (a: Map<string, TYPE>, b: Map<string, TYPE>) =>
	a.size === b.size && [...a].every(([name, type]) => b.get(name) === type);

/** Every problem with the catalogs, each naming its key; empty when they pass. */
export function checkCatalogs(dir: string, features: string[]): string[] {
	const problems: string[] = [];
	const en = readCatalog<Partial<EnglishEntry>>(dir, 'en');
	const prefixes = new Set([...sharedPrefixes, ...features]);
	const englishArguments = new Map<string, Map<string, TYPE>>();

	const checkOrder = (locale: string, keys: string[]) => {
		const outOfOrder = keys.findIndex((key, index) => index > 0 && byKey(keys[index - 1], key) > 0);
		if (outOfOrder > 0) {
			problems.push(`${locale}: ${keys[outOfOrder]} is out of order; run npm run i18n:sort`);
		}
	};

	for (const [key, entry] of Object.entries(en)) {
		if (!prefixes.has(key.split('.')[0])) {
			problems.push(
				`en: ${key} must start with a feature folder name or ${sharedPrefixes.join(', ')}`
			);
		}
		if (!entry.description?.trim()) problems.push(`en: ${key} has no description`);
		try {
			englishArguments.set(key, argumentsOf(entry.text ?? ''));
		} catch {
			problems.push(`en: ${key} is not valid ICU MessageFormat`);
		}
	}
	checkOrder('en', Object.keys(en));

	for (const locale of translationLocales(dir)) {
		const catalog = readCatalog<Partial<TranslationEntry>>(dir, locale);
		for (const [key, english] of Object.entries(en)) {
			const translation = catalog[key];
			if (!translation?.text?.trim()) {
				problems.push(`${locale}: ${key} is missing`);
				continue;
			}
			if (translation.source !== sourceHash(english.text ?? '')) {
				problems.push(
					`${locale}: ${key} translates an older English text; review it and update source`
				);
			}
			const expected = englishArguments.get(key);
			try {
				if (expected && !sameArguments(argumentsOf(translation.text), expected)) {
					problems.push(`${locale}: ${key} uses different placeholders than the English text`);
				}
			} catch {
				problems.push(`${locale}: ${key} is not valid ICU MessageFormat`);
			}
		}
		checkOrder(locale, Object.keys(catalog));
	}
	return problems;
}
