// The request pipeline (D5): session, locale, setup gate, route guard. SvelteKit's own CSRF
// check runs before all of them.
import { DATABASE_PATH, I18N_PSEUDO } from '$app/env/private';
import { redirect } from '@sveltejs/kit';
import { sequence, type Handle, type ServerInit } from '@sveltejs/kit/hooks';
import { resolveActor, setupStatus } from '#lib/features/auth/server/index.ts';
import { getDictionary, listInstalled } from '#lib/features/languages/server/index.ts';
import { provideDictionary } from '#lib/i18n/dictionaries.ts';
import { resolveLocale, textDirection } from '#lib/i18n/locale.ts';
import { startup } from '#lib/server/startup.ts';
import { buildCtx, unidentifiedCtx } from '#lib/server/web/ctx.ts';
import { signInUrl } from '#lib/server/web/redirects.ts';
import { applySessionResult, readSessionToken } from '#lib/server/web/session-cookie.ts';

let db: App.Locals['db'];

export const init: ServerInit = () => {
	db = startup({ databasePath: DATABASE_PATH, pseudoLocale: I18N_PSEUDO });
};

// Served to everyone: what setup and sign-in need to render and the app needs to install.
// Built and static files are served by adapter-node before this pipeline runs.
const beforeSetup = ['/setup', '/offline', '/manifest.webmanifest', '/service-worker.js'];
const beforeSetupPrefixes = ['/i18n/', '/icons/', '/_app/'];
const isServedBeforeSetup = (path: string) =>
	beforeSetup.includes(path) || beforeSetupPrefixes.some((prefix) => path.startsWith(prefix));
const isPublic = (path: string) => path === '/login' || isServedBeforeSetup(path);

const session: Handle = ({ event, resolve }) => {
	event.locals.db = db;
	const token = readSessionToken(event);
	const { actor, session } = resolveActor(unidentifiedCtx(event), token);
	event.locals.actor = actor;
	applySessionResult(event, token, session);
	return resolve(event);
};

const locale: Handle = ({ event, resolve }) => {
	const ctx = buildCtx(event, 'en');
	const saved = ctx.actor.kind === 'user' ? ctx.actor.locale : null;
	const accept = event.request.headers.get('accept-language');
	const code = resolveLocale(saved, accept, listInstalled(ctx));
	const dictionary = getDictionary(ctx, code);
	provideDictionary(dictionary.url, dictionary.messages);
	event.locals.locale = code;
	event.locals.dictionaryUrl = dictionary.url;
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%lang%', code).replace('%dir%', textDirection(code))
	});
};

const setupGate: Handle = ({ event, resolve }) => {
	if (!isServedBeforeSetup(event.url.pathname) && setupStatus(buildCtx(event)).open) {
		redirect(303, '/setup');
	}
	return resolve(event);
};

const routeGuard: Handle = ({ event, resolve }) => {
	if (event.locals.actor.kind === 'user' || isPublic(event.url.pathname)) return resolve(event);
	const { method, headers } = event.request;
	const wantsPage =
		event.isDataRequest ||
		((method === 'GET' || method === 'HEAD') &&
			(headers.get('accept') ?? '').includes('text/html'));
	if (wantsPage) redirect(303, signInUrl(event.url));
	return new Response('Unauthorized', { status: 401 });
};

export const handle = sequence(session, locale, setupGate, routeGuard);
