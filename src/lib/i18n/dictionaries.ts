// Hands a locale's dictionary to the root layout without putting it in the page data (D14).
// On the server, the request pipeline provides the dictionary it built; in the browser, it is
// fetched from its content-hashed URL, which the HTTP cache keeps.
import type { Dictionary } from './t.ts';

// Keyed by URL, which changes whenever the content does, so an entry never goes stale. Entries
// are kept after an edit, so a page rendering during the edit still finds the version it started
// with; edits are rare administrator actions.
const byUrl = new Map<string, Dictionary>();

export function provideDictionary(url: string, dictionary: Dictionary): void {
	byUrl.set(url, dictionary);
}

export async function loadDictionary(
	url: string,
	fetch: typeof globalThis.fetch
): Promise<Dictionary> {
	const provided = byUrl.get(url);
	if (provided) return provided;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Dictionary ${url} failed to load: ${response.status}`);
	const dictionary = (await response.json()) as Dictionary;
	byUrl.set(url, dictionary);
	return dictionary;
}
