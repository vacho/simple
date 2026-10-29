import { describe, expect, it } from 'vitest';
import { passwordChangeUrl, safeRedirect, signInUrl } from './redirects.ts';

describe('safeRedirect', () => {
	it('keeps paths on this site', () => {
		expect(safeRedirect('/settings')).toBe('/settings');
		expect(safeRedirect('/profile?tab=1#top')).toBe('/profile?tab=1#top');
	});

	it.each([
		'https://evil.example',
		'//evil.example/path',
		'/\\evil.example',
		'javascript:alert(1)',
		'settings',
		'',
		null
	])('rejects %j', (target) => {
		expect(safeRedirect(target)).toBe('/');
	});
});

describe('signInUrl', () => {
	it('remembers the requested page', () => {
		expect(signInUrl(new URL('http://x/settings?a=1'))).toBe(
			'/login?redirectTo=%2Fsettings%3Fa%3D1'
		);
		expect(signInUrl(new URL('http://x/'))).toBe('/login');
	});
});

describe('passwordChangeUrl', () => {
	it('remembers the requested page', () => {
		expect(passwordChangeUrl(new URL('http://x/members?a=1'))).toBe(
			'/password?redirectTo=%2Fmembers%3Fa%3D1'
		);
		expect(passwordChangeUrl(new URL('http://x/'))).toBe('/password');
	});
});
