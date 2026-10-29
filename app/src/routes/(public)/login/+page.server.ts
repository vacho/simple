import { redirect } from '@sveltejs/kit';
import { signIn } from '#lib/features/auth/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { safeRedirect } from '#lib/server/web/redirects.ts';
import { failForAction } from '#lib/server/web/responses.ts';
import { setSessionCookie } from '#lib/server/web/session-cookie.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.actor.kind === 'user') redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const username = String(form.get('username') ?? '');
		let session;
		try {
			session = await signIn(buildCtx(event), {
				username,
				password: String(form.get('password') ?? ''),
				address: event.getClientAddress(),
				timeZone: String(form.get('timeZone') ?? '')
			});
		} catch (error) {
			return failForAction(error, { username });
		}
		setSessionCookie(event, session.token, session.expiresAt);
		redirect(303, safeRedirect(event.url.searchParams.get('redirectTo')));
	}
};
