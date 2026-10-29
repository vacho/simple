// The choices of the profile page (D14): every installed language, and every time zone.
import { languageName } from '../../i18n/language-names.ts';

export function languageOptions(installed: readonly string[]) {
	return installed.map((code) => ({ code, name: languageName(code) }));
}

/** UTC first, then every zone Intl knows; the user's current zone is always selectable. */
export function timeZoneOptions(current: string | null): string[] {
	const zones = ['UTC', ...Intl.supportedValuesOf('timeZone').filter((zone) => zone !== 'UTC')];
	return current && !zones.includes(current) ? [zones[0], current, ...zones.slice(1)] : zones;
}
