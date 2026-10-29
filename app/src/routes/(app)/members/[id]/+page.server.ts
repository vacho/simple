import { redirect } from '@sveltejs/kit';
import {
	archiveMember,
	deleteMember,
	getMember,
	listMemberTypes,
	unarchiveMember,
	updateMember
} from '#lib/features/household/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { failForAction, throwForLoad } from '#lib/server/web/responses.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = (event) => {
	const ctx = buildCtx(event);
	try {
		const member = getMember(ctx, event.params.id);
		// Choosable types, plus the member's own type even when it is archived.
		const types = listMemberTypes(ctx).filter(
			(type) => !type.archived || type.id === member.memberTypeId
		);
		// A destructive action is confirmed on the page, as a second step (design D6).
		const action = event.url.searchParams.get('confirm');
		const confirm = action === 'archive' || action === 'delete' ? action : null;
		return { member, types, confirm };
	} catch (error) {
		throwForLoad(error);
	}
};

/** Runs one change, then goes where `done` says; a failure keeps what was typed. */
const act =
	(
		change: (ctx: ReturnType<typeof buildCtx>, id: string, values: Record<string, string>) => void,
		done: (event: RequestEvent) => string = (event) => event.url.pathname
	) =>
	async (event: RequestEvent) => {
		const form = await event.request.formData();
		const values = {
			name: String(form.get('name') ?? ''),
			memberTypeId: String(form.get('memberTypeId') ?? '')
		};
		try {
			change(buildCtx(event), event.params.id, values);
		} catch (error) {
			return failForAction(error, values);
		}
		redirect(303, done(event));
	};

export const actions: Actions = {
	update: act((ctx, id, values) => updateMember(ctx, id, values)),
	archive: act((ctx, id) => archiveMember(ctx, id)),
	unarchive: act((ctx, id) => unarchiveMember(ctx, id)),
	delete: act(
		(ctx, id) => deleteMember(ctx, id),
		() => '/members'
	)
};
