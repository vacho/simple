import { redirect } from '@sveltejs/kit';

export const toLogin = () => redirect(303, '/login');
