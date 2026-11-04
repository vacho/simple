import { listAccounts } from '#lib/features/users/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { throwForLoad } from '#lib/server/web/responses.ts';
import { accountActions } from '../../account-actions.server.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const ctx = buildCtx(event);
	try {
		return {
			accounts: listAccounts(ctx),
			ownId: ctx.actor.kind === 'user' ? ctx.actor.id : null
		};
	} catch (error) {
		throwForLoad(error);
	}
};

export const actions: Actions = accountActions;
