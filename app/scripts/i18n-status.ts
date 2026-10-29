// Lists the missing and stale texts of each translation catalog (D14).
import { sourceHash } from '../src/lib/server/core/source-hash.ts';
import {
	messagesDir,
	readCatalog,
	translationLocales,
	type EnglishEntry,
	type TranslationEntry
} from './messages.ts';

const en = readCatalog<EnglishEntry>(messagesDir, 'en');
for (const locale of translationLocales(messagesDir)) {
	const catalog = readCatalog<Partial<TranslationEntry>>(messagesDir, locale);
	const missing = Object.keys(en).filter((key) => !catalog[key]?.text?.trim());
	const stale = Object.keys(en).filter(
		(key) => catalog[key]?.text?.trim() && catalog[key]?.source !== sourceHash(en[key].text)
	);
	console.log(`${locale}: ${missing.length} missing, ${stale.length} stale`);
	for (const key of missing) console.log(`  missing ${key}`);
	for (const key of stale) console.log(`  stale   ${key}`);
}
