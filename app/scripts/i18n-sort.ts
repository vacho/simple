// Sorts every message catalog by key, so parallel branches add keys without conflicts (D14).
import {
	messagesDir,
	readCatalog,
	sortCatalog,
	translationLocales,
	writeCatalog
} from './messages.ts';

for (const locale of ['en', ...translationLocales(messagesDir)]) {
	writeCatalog(messagesDir, locale, sortCatalog(readCatalog(messagesDir, locale)));
}
