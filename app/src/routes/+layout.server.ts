import type { LayoutServerLoad } from './$types';

// Server and client render with the same locale and time zone (D14).
export const load: LayoutServerLoad = ({ locals }) => ({
	locale: locals.locale,
	dictionaryUrl: locals.dictionaryUrl,
	timeZone: locals.actor.kind === 'user' ? locals.actor.timeZone : null
});
