// Language names in their own language (D14), from CLDR through Intl.DisplayNames. CLDR writes
// many in lower case (español, français, català), so the first letter is upper-cased with that
// language's own rules.
export function languageName(code: string): string {
	const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
	return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}
