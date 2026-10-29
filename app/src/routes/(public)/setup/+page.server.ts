import { redirect } from '@sveltejs/kit';
import { setup, setupStatus } from '#lib/features/auth/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { failForAction } from '#lib/server/web/responses.ts';
import { setSessionCookie } from '#lib/server/web/session-cookie.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	if (!setupStatus(buildCtx(event)).open) redirect(303, '/login');
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const field = (name: string) => String(form.get(name) ?? '');
		const values = { displayName: field('displayName'), username: field('username') };
		let session;
		try {
			session = await setup(buildCtx(event), {
				...values,
				password: field('password'),
				timeZone: field('timeZone')
			});
		} catch (error) {
			return failForAction(error, values);
		}
		setSessionCookie(event, session.token, session.expiresAt);
		redirect(303, '/');
	}
};
