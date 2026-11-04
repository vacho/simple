import { dev } from '$app/env';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	if (!dev) error(404);
	return {};
};

export const actions: Actions = {
	sample: async ({ request }) => {
		if (!dev) error(404);
		const data = await request.formData();
		return {
			selection: String(data.get('selection') ?? ''),
			passwordLength: String(data.get('sample-password') ?? '').length
		};
	},
	save: async () => {
		if (!dev) error(404);
		await new Promise((resolve) => setTimeout(resolve, 150));
		return { saved: true };
	},
	fail: async () => {
		if (!dev) error(404);
		return fail(422, { fieldError: 'household.name.taken' });
	},
	redirect: async () => {
		if (!dev) error(404);
		redirect(303, '/dev/components?result=redirect');
	}
};
