import { DATABASE_PATH, I18N_PSEUDO } from '$app/env/private';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { getDictionary, listInstalled } from '#lib/features/languages/server/index.ts';
import { provideDictionary } from '#lib/i18n/dictionaries.ts';
import { resolveLocale, textDirection } from '#lib/i18n/locale.ts';
import { startup } from '#lib/server/startup.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';

let db: App.Locals['db'];

export const init: ServerInit = () => {
	db = startup({ databasePath: DATABASE_PATH, pseudoLocale: I18N_PSEUDO });
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = db;
	const ctx = buildCtx(event);
	const saved = ctx.actor.kind === 'user' ? ctx.actor.locale : null;
	const accept = event.request.headers.get('accept-language');
	const locale = resolveLocale(saved, accept, listInstalled(ctx));
	const dictionary = getDictionary(ctx, locale);
	provideDictionary(dictionary.url, dictionary.messages);
	event.locals.locale = locale;
	event.locals.dictionaryUrl = dictionary.url;
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%lang%', locale).replace('%dir%', textDirection(locale))
	});
};
