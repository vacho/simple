import { redirect } from '@sveltejs/kit';
import { signOut } from '#lib/features/auth/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { failForAction } from '#lib/server/web/responses.ts';
import { applySessionResult, readSessionToken } from '#lib/server/web/session-cookie.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: (event) => {
		const token = readSessionToken(event);
		try {
			if (token) signOut(buildCtx(event), token);
		} catch (error) {
			return failForAction(error);
		}
		applySessionResult(event, token, { action: 'clear' });
		redirect(303, '/login');
	}
};
