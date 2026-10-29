import { expect, test } from '@playwright/test';
import { proxyHeaders, startSetUpApp } from './app.ts';

test('Forged form submission: a POST from another origin is rejected', async () => {
	const { app, cookie } = await startSetUpApp();
	const submit = (origin: string) =>
		fetch(`${app.url}/`, {
			method: 'POST',
			headers: {
				...proxyHeaders,
				'content-type': 'application/x-www-form-urlencoded',
				origin,
				cookie
			},
			body: 'x=1',
			redirect: 'manual'
		});
	const forged = await submit('https://evil.example');
	expect(forged.status).toBe(403);
	expect(await forged.text()).toContain('Cross-site');
	// The same submission from the app's own origin passes the check (and reaches the route).
	const own = await submit(app.url);
	expect(own.status, await own.text()).not.toBe(403);
	await app.stop();
});
