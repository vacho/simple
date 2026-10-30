import { redirect } from '@sveltejs/kit';
import { v7 } from 'uuid';
import {
	archiveMemberType,
	createMemberType,
	deleteMemberType,
	listMemberTypes,
	unarchiveMemberType,
	updateMemberType
} from '#lib/features/household/server/index.ts';
import { can } from '#lib/server/policy/policy.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { denyUnless, failForAction, throwForLoad } from '#lib/server/web/responses.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = (event) => {
	const ctx = buildCtx(event);
	denyUnless(can(ctx.actor, 'memberTypes.manage'));
	try {
		const types = listMemberTypes(ctx);
		// A destructive action is confirmed on the page, as a second step (design D6).
		const action = event.url.searchParams.get('confirm');
		const target = types.find((type) => type.id === event.url.searchParams.get('id'));
		const confirm =
			target && (action === 'archive' || action === 'delete') ? { action, type: target } : null;
		// The ID of the next type, so submitting the form twice creates it once (ADR 0007).
		return { types, confirm, newId: v7() };
	} catch (error) {
		throwForLoad(error);
	}
};

const fields = async (event: RequestEvent) => {
	const form = await event.request.formData();
	return Object.fromEntries(
		['id', 'name', 'baseClass'].flatMap((key) =>
			form.has(key) ? [[key, String(form.get(key))]] : []
		)
	) as Record<string, string>;
};

/** Runs one change, then shows the list again; a failure keeps what was typed. */
const act =
	(
		change: (ctx: ReturnType<typeof buildCtx>, values: Record<string, string>) => void,
		form = 'row'
	) =>
	async (event: RequestEvent) => {
		const values = await fields(event);
		try {
			change(buildCtx(event), values);
		} catch (error) {
			// `form` tells the page which form the errors belong to.
			return failForAction(error, { ...values, form });
		}
		redirect(303, event.url.pathname);
	};

export const actions: Actions = {
	create: act((ctx, values) => createMemberType(ctx, values), 'create'),
	update: act((ctx, { id, name, baseClass }) =>
		updateMemberType(ctx, id, baseClass === undefined ? { name } : { name, baseClass })
	),
	archive: act((ctx, { id }) => archiveMemberType(ctx, id)),
	unarchive: act((ctx, { id }) => unarchiveMemberType(ctx, id)),
	delete: act((ctx, { id }) => deleteMemberType(ctx, id))
};
