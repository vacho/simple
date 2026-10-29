// Client-safe translator over a precompiled dictionary (D14). The server parses messages once;
// here they are only rendered, so the browser bundle never needs the ICU parser.
import { createContext } from 'svelte';
import { IntlMessageFormat } from 'intl-messageformat';
import type { MessageKey, MessageParams } from './keys.ts';

export type CompiledMessage = Exclude<ConstructorParameters<typeof IntlMessageFormat>[0], string>;

/** A locale's merged messages, fallback chain already applied, keyed by message key. */
export type Dictionary = Record<string, CompiledMessage>;

type Args<K extends MessageKey> = MessageParams[K] extends undefined ? [] : [MessageParams[K]];

export type Translate = <K extends MessageKey>(key: K, ...args: Args<K>) => string;

export function createTranslator(locale: string, dictionary: Dictionary): Translate {
	const formats = new Map<string, IntlMessageFormat>();
	return (key, ...args) => {
		let format = formats.get(key);
		if (!format) {
			const message = dictionary[key];
			// The dictionary always holds every English key; this guards a stale client cache.
			if (!message) return key;
			format = new IntlMessageFormat(message, locale);
			formats.set(key, format);
		}
		return String(format.format(args[0]));
	};
}

export interface I18n {
	readonly locale: string;
	readonly t: Translate;
}

export const [getI18n, setI18n] = createContext<I18n>();

/**
 * Translates a message key that arrives as data, such as a validation issue from the server.
 * A key the dictionary doesn't know shows the generic validation text, never the key itself.
 */
export function translateKey(
	t: Translate,
	key: string,
	params: Record<string, string | number> = {}
): string {
	const text = (t as (key: string, params: object) => string)(key, params);
	return text === key ? t('validation.invalid') : text;
}
