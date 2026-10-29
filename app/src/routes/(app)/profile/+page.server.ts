import { redirect } from '@sveltejs/kit';
import { listInstalled } from '#lib/features/languages/server/index.ts';
import { languageOptions, timeZoneOptions } from '#lib/features/users/profile-options.ts';
import { getProfile, updateProfile } from '#lib/features/users/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { failForAction, throwForLoad } from '#lib/server/web/responses.ts';
import type { Actions, PageServerLoad } from './$types';

const ownId = (actor: App.Locals['actor']) => {
	if (actor.kind !== 'user') redirect(303, '/login');
	return actor.id;
};

export const load: PageServerLoad = (event) => {
	try {
		const ctx = buildCtx(event);
		const profile = getProfile(ctx, ownId(ctx.actor));
		return {
			profile,
			languages: languageOptions(listInstalled(ctx)),
			timeZones: timeZoneOptions(profile.timeZone)
		};
	} catch (error) {
		throwForLoad(error);
	}
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const values = {
			locale: String(form.get('locale') ?? ''),
			timeZone: String(form.get('timeZone') ?? '')
		};
		try {
			const ctx = buildCtx(event);
			// An empty choice is "browser default".
			updateProfile(ctx, ownId(ctx.actor), {
				locale: values.locale || null,
				timeZone: values.timeZone
			});
		} catch (error) {
			return failForAction(error, values);
		}
		// The next request resolves the new language and zone from scratch (D5).
		redirect(303, '/profile');
	}
};
