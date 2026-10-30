import { redirect } from '@sveltejs/kit';
import { getHousehold, renameHousehold } from '#lib/features/household/server/index.ts';
import { can } from '#lib/server/policy/policy.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { denyUnless, failForAction, throwForLoad } from '#lib/server/web/responses.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const ctx = buildCtx(event);
	denyUnless(can(ctx.actor, 'household.update'));
	try {
		return { household: getHousehold(ctx), saved: event.url.searchParams.has('saved') };
	} catch (error) {
		throwForLoad(error);
	}
};

export const actions: Actions = {
	default: async (event) => {
		const values = { name: String((await event.request.formData()).get('name') ?? '') };
		try {
			renameHousehold(buildCtx(event), values);
		} catch (error) {
			return failForAction(error, values);
		}
		redirect(303, '?saved');
	}
};
