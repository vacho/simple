// Account input rules (D4), client-safe so the browser, account creation, sign-in and throttling
// share one implementation. Messages are message keys (D16).
import * as v from 'valibot';

const codePoints = (text: string) => [...text].length;

/** Trim, NFKC, lowercase: the same at account creation, sign-in and throttling. */
export function normalizeUsername(value: string): string {
	return value.trim().normalize('NFKC').toLowerCase();
}

export const username = v.pipe(
	v.string(),
	v.transform(normalizeUsername),
	v.regex(/^[a-z0-9._-]{3,32}$/, 'users.username.invalid')
);

export const displayName = v.pipe(
	v.string(),
	v.transform((value) => value.trim().normalize('NFKC')),
	v.check((value) => codePoints(value) > 0, 'users.display_name.empty'),
	v.check((value) => codePoints(value) <= 64, 'users.display_name.too_long'),
	v.check((value) => !/\p{Cc}/u.test(value), 'users.display_name.control_characters')
);

/** NFKC only: spaces are part of the password. Length in code points. */
export const password = v.pipe(
	v.string(),
	v.transform((value) => value.normalize('NFKC')),
	v.check((value) => codePoints(value) >= 8 && codePoints(value) <= 128, 'users.password.length')
);

/**
 * The canonical form of an IANA time zone (ADR 0021), or undefined when the value isn't one.
 * Numeric offsets (+02:00) are refused: Intl accepts them, but they don't follow daylight saving.
 */
export function canonicalTimeZone(value: string): string | undefined {
	try {
		const zone = new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
		return /^[+-]/.test(zone) ? undefined : zone;
	} catch {
		return undefined;
	}
}

export const timeZone = v.pipe(
	v.string(),
	v.transform((value) => canonicalTimeZone(value.trim()) ?? ''),
	v.minLength(1, 'users.time_zone.invalid')
);

export const newAccount = v.object({ displayName, username, password });

/** Profile changes: a locale code or null for "browser default", and a time zone. */
export const profileChanges = v.partial(
	v.object({ locale: v.nullable(v.pipe(v.string(), v.minLength(1))), timeZone })
);
