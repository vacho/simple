import { describe, expect, it } from 'vitest';
import { applySessionResult, sessionCookie, setSessionCookie } from './session-cookie.ts';

function recorder(url = 'https://home.example/') {
	const calls: { op: 'set' | 'delete'; name: string; value?: string; options?: object }[] = [];
	return {
		calls,
		url: new URL(url),
		cookies: {
			set: (name: string, value: string, options?: object) => {
				calls.push({ op: 'set', name, value, options });
			},
			delete: (name: string, options?: object) => {
				calls.push({ op: 'delete', name, options });
			}
		}
	};
}

const now = Date.UTC(2026, 9, 29, 12);
const days = (n: number) => n * 24 * 60 * 60 * 1000;

describe('session cookie', () => {
	it('sends nothing on keep', () => {
		const event = recorder();
		applySessionResult(event, 'token', { action: 'keep' }, now);
		expect(event.calls).toEqual([]);
	});

	it('re-sends the cookie on renew, with Max-Age matching expiresAt', () => {
		const event = recorder();
		applySessionResult(
			event,
			'token',
			{ action: 'renew', expiresAt: new Date(now + days(30)) },
			now
		);
		expect(event.calls).toEqual([
			{
				op: 'set',
				name: sessionCookie,
				value: 'token',
				options: {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: true,
					maxAge: 30 * 24 * 60 * 60
				}
			}
		]);
	});

	it('deletes the cookie on clear', () => {
		const event = recorder();
		applySessionResult(event, 'token', { action: 'clear' }, now);
		expect(event.calls).toEqual([{ op: 'delete', name: sessionCookie, options: { path: '/' } }]);
	});

	it('is Secure only when the request is HTTPS', () => {
		const event = recorder('http://localhost:5173/');
		setSessionCookie(event, 'token', new Date(now + days(1)), now);
		expect(event.calls[0].options).toMatchObject({ secure: false, maxAge: 24 * 60 * 60 });
	});
});
