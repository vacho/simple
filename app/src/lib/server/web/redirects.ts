// Redirect targets after sign-in (D5): only same-origin relative paths, so a link can never send
// a user to another site.

/** The target when it is a path on this site, otherwise the fallback. */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
		return fallback;
	}
	try {
		const base = 'http://app.invalid';
		const url = new URL(target, base);
		return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback;
	} catch {
		return fallback;
	}
}

/** The sign-in page, remembering where the visitor was going. */
export function signInUrl(requested: URL): string {
	const target = `${requested.pathname}${requested.search}`;
	return target === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(target)}`;
}
