import { DATABASE_PATH } from '$app/env/private';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { getDictionary, listInstalled } from '#lib/features/languages/server/index.ts';
import { provideDictionary } from '#lib/i18n/dictionaries.ts';
import { matchLocale, parseAcceptLanguage } from '#lib/i18n/locale.ts';
import { startup } from '#lib/server/startup.ts';

let db: App.Locals['db'];

export const init: ServerInit = () => {
	db = startup({ databasePath: DATABASE_PATH });
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = db;
	const preferences = parseAcceptLanguage(event.request.headers.get('accept-language'));
	const locale = matchLocale(preferences, listInstalled()) ?? 'en';
	const dictionary = getDictionary(locale);
	provideDictionary(dictionary.url, dictionary.messages);
	event.locals.locale = locale;
	event.locals.dictionaryUrl = dictionary.url;
	return resolve(event);
};
