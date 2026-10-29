import { redirect } from '@sveltejs/kit';
import { v7 } from 'uuid';
import {
	createMember,
	getHousehold,
	listMembers,
	listMemberTypes
} from '#lib/features/household/server/index.ts';
import { can } from '#lib/server/policy/policy.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { failForAction, throwForLoad } from '#lib/server/web/responses.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const ctx = buildCtx(event);
	try {
		const manage = can(ctx.actor, 'members.manage');
		return {
			household: getHousehold(ctx),
			list: listMembers(ctx),
			manage,
			// Types a new member can have, and the ID of that member (ADR 0007).
			types: manage ? listMemberTypes(ctx).filter((type) => !type.archived) : [],
			newId: v7()
		};
	} catch (error) {
		throwForLoad(error);
	}
};

export const actions: Actions = {
	create: async (event) => {
		const form = await event.request.formData();
		const values = {
			id: String(form.get('id') ?? ''),
			name: String(form.get('name') ?? ''),
			memberTypeId: String(form.get('memberTypeId') ?? '')
		};
		try {
			createMember(buildCtx(event), values);
		} catch (error) {
			return failForAction(error, values);
		}
		redirect(303, event.url.pathname);
	}
};
