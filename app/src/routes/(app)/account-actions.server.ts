// Form actions on one account (spec user-auth), shared by the member page and the accounts page.
// The account comes from the form's `userId`; the policy refuses the actor's own (ADR 0027).
import { deactivate, resetPassword } from '#lib/features/auth/server/index.ts';
import { setActive, setRole } from '#lib/features/users/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { failForAction } from '#lib/server/web/responses.ts';
import type { RequestEvent } from '@sveltejs/kit';

type Change = (ctx: ReturnType<typeof buildCtx>, userId: number, form: FormData) => unknown;

const act = (change: Change) => async (event: RequestEvent) => {
	const form = await event.request.formData();
	const userId = Number(form.get('userId'));
	// Never the password: a failed form is filled again without it.
	const values = {
		userId: String(userId),
		role: String(form.get('role') ?? ''),
		form: 'account'
	};
	try {
		await change(buildCtx(event), userId, form);
	} catch (error) {
		return failForAction(error, values);
	}
	return { done: true };
};

export const accountActions = {
	resetPassword: act((ctx, userId, form) =>
		resetPassword(ctx, userId, { password: String(form.get('password') ?? '') })
	),
	deactivate: act((ctx, userId) => deactivate(ctx, userId)),
	reactivate: act((ctx, userId) => setActive(ctx, userId, true)),
	setRole: act((ctx, userId, form) => setRole(ctx, userId, String(form.get('role') ?? '')))
};
