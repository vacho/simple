import { redirect } from '@sveltejs/kit';
import { getProfile } from '#lib/features/users/server/index.ts';
import { can } from '#lib/server/policy/policy.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { throwForLoad } from '#lib/server/web/responses.ts';
import type { LayoutServerLoad } from './$types';

export type Section = 'home' | 'settings';

export const load: LayoutServerLoad = (event) => {
	const { actor } = event.locals;
	// The route guard already sends visitors to sign in; this narrows the type.
	if (actor.kind !== 'user') redirect(303, '/login');
	try {
		const { displayName } = getProfile(buildCtx(event), actor.id);
		// Only the sections this user may open (D10): later changes add their own entries.
		const navigation: Section[] = ['home'];
		if (can(actor, 'settings.view')) navigation.push('settings');
		return { displayName, navigation };
	} catch (error) {
		throwForLoad(error);
	}
};
