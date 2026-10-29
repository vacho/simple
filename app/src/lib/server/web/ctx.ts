import type { RequestEvent } from '@sveltejs/kit';
import type { Ctx } from '../core/ctx.ts';

/** The ctx a route passes to services, from what the request pipeline put in locals (D5). */
export function buildCtx({ locals }: Pick<RequestEvent, 'locals'>): Ctx {
	return { db: locals.db, actor: locals.actor, locale: locals.locale, inTransaction: false };
}
