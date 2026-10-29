// Browser-language matching (D14), shared by the request pipeline (Accept-Language) and the
// service worker (navigator.languages).

const languageRange = /^(?:[a-z]{1,8}(?:-[a-z0-9]{1,8})*|\*)$/i;
const weight = /^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i;

/** Language ranges of an Accept-Language header (RFC 9110), best first; q=0 and malformed entries dropped. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
	if (!header) return [];
	const ranges: { tag: string; q: number; order: number }[] = [];
	header.split(',').forEach((entry, order) => {
		const [tag, ...params] = entry.split(';').map((part) => part.trim());
		if (!tag || !languageRange.test(tag) || tag === '*') return;
		let q = 1;
		for (const param of params) {
			const match = weight.exec(param);
			if (!match) return;
			q = Number(match[1]);
		}
		if (q > 0) ranges.push({ tag, q, order });
	});
	return ranges.sort((a, b) => b.q - a.q || a.order - b.order).map(({ tag }) => tag);
}

/** First preference matching an installed language: exact tag first, then its primary subtag. */
export function matchLocale(
	preferences: readonly string[],
	installed: readonly string[]
): string | undefined {
	const byLowerCase = new Map(installed.map((code) => [code.toLowerCase(), code]));
	for (const preference of preferences) {
		const tag = preference.toLowerCase();
		const match = byLowerCase.get(tag) ?? byLowerCase.get(tag.split('-')[0]);
		if (match) return match;
	}
	return undefined;
}
