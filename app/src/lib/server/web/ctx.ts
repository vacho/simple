import type { RequestEvent } from '@sveltejs/kit';
import { anonymous } from '../core/actor.ts';
import type { Ctx } from '../core/ctx.ts';

/** The ctx a route passes to services, from what the request pipeline put in locals (D5). */
export function buildCtx({ locals }: Pick<RequestEvent, 'locals'>): Ctx {
	return {
		db: locals.db,
		// Before the session step has run, a request acts as anonymous: the least privilege.
		actor: locals.actor ?? anonymous,
		locale: locals.locale,
		inTransaction: false
	};
}
