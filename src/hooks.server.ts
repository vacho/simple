import type { Handle } from '@sveltejs/kit/hooks';
import { getDictionary, listInstalled } from '#lib/features/languages/server/index.ts';
import { provideDictionary } from '#lib/i18n/dictionaries.ts';
import { matchLocale, parseAcceptLanguage } from '#lib/i18n/locale.ts';

export const handle: Handle = async ({ event, resolve }) => {
	const preferences = parseAcceptLanguage(event.request.headers.get('accept-language'));
	const locale = matchLocale(preferences, listInstalled()) ?? 'en';
	const dictionary = getDictionary(locale);
	provideDictionary(dictionary.url, dictionary.messages);
	event.locals.locale = locale;
	event.locals.dictionaryUrl = dictionary.url;
	return resolve(event);
};
