import { redirect } from '@sveltejs/kit';
import { changeOwnPassword } from '#lib/features/auth/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { safeRedirect } from '#lib/server/web/redirects.ts';
import { failForAction } from '#lib/server/web/responses.ts';
import { readSessionToken } from '#lib/server/web/session-cookie.ts';
import type { Actions, PageServerLoad } from './$types';

// The forced change after an administrator set the password; others change it on their profile.
export const load: PageServerLoad = ({ locals }) => {
	if (locals.actor.kind !== 'user' || !locals.actor.passwordTemporary) redirect(303, '/profile');
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		try {
			await changeOwnPassword(buildCtx(event), readSessionToken(event) ?? '', {
				password: String(form.get('password') ?? ''),
				confirm: String(form.get('confirm') ?? ''),
				address: event.getClientAddress()
			});
		} catch (error) {
			return failForAction(error);
		}
		redirect(303, safeRedirect(event.url.searchParams.get('redirectTo')));
	}
};
