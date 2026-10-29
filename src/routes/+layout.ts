import { loadDictionary } from '#lib/i18n/dictionaries.ts';
import { createTranslator } from '#lib/i18n/t.ts';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, fetch }) => {
	const dictionary = await loadDictionary(data.dictionaryUrl, fetch);
	return { ...data, t: createTranslator(data.locale, dictionary) };
};
