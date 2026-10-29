// Language-aware formatting (D14) on Intl, with the active locale and the user's time zone.
// Timestamps are UTC (ADR 0021); they are shown in the user's zone, or UTC when it isn't set.

const zone = (timeZone: string | null) => timeZone ?? 'UTC';

export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions) {
	return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(value: Date, locale: string, timeZone: string | null) {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: zone(timeZone) }).format(
		value
	);
}

export function formatTime(value: Date, locale: string, timeZone: string | null) {
	return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: zone(timeZone) }).format(
		value
	);
}

export function formatDateTime(value: Date, locale: string, timeZone: string | null) {
	return new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: zone(timeZone)
	}).format(value);
}
