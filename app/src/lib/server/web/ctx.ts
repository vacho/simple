import type { RequestEvent } from '@sveltejs/kit';
import { anonymous } from '../core/actor.ts';
import type { Ctx } from '../core/ctx.ts';

type Event = Pick<RequestEvent, 'locals'>;

/**
 * The ctx a route passes to services, from what the request pipeline put in locals (D5). The
 * locale step passes a provisional locale while it resolves the request's own.
 */
export function buildCtx({ locals }: Event, locale = locals.locale): Ctx {
	return { db: locals.db, actor: locals.actor, locale, inTransaction: false };
}

/** The ctx of the session step, before the request is identified: anonymous. */
export function unidentifiedCtx({ locals }: Event): Ctx {
	return { db: locals.db, actor: anonymous, locale: 'en', inTransaction: false };
}
