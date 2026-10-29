// The session cookie (D4): HttpOnly, SameSite=Lax, Path=/, Secure when the request is HTTPS.
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import type { SessionResult } from '../core/session.ts';

export const sessionCookie = 'session';

type CookieEvent = { cookies: Pick<Cookies, 'set' | 'delete'>; url: URL };

export function readSessionToken(event: Pick<RequestEvent, 'cookies'>): string | undefined {
	return event.cookies.get(sessionCookie);
}

export function setSessionCookie(
	event: CookieEvent,
	token: string,
	expiresAt: Date,
	now = Date.now()
): void {
	event.cookies.set(sessionCookie, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:',
		maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000))
	});
}

export function applySessionResult(
	event: CookieEvent,
	token: string | undefined,
	session: SessionResult,
	now = Date.now()
): void {
	if (session.action === 'renew' && token) setSessionCookie(event, token, session.expiresAt, now);
	if (session.action === 'clear') event.cookies.delete(sessionCookie, { path: '/' });
}
