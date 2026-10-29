// The en-XA pseudo-locale (D14): every English text with accented letters, brackets and about
// 35% extra length ("[Ĥöɱé ~~]"). Hard-coded text stays plain and long languages break layouts,
// so an e2e run in en-XA shows both. Only literal text changes; arguments and plurals still work.
import { TYPE } from '@formatjs/icu-messageformat-parser';
import type { Compiled } from './compile.ts';

export const pseudoLocale = 'en-XA';

const accented: Record<string, string> = Object.fromEntries(
	[...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter, index) => [
		letter,
		[...'áƀçðéƒĝĥîĵķĺɱñöþǫŕšţûṽŵẋýžÅƁÇÐÉƑĜĤÎĴĶĹṀÑÖÞǪŔŠŢÛṼŴẊÝŽ'][index]
	])
);

function transform(elements: Compiled): { elements: Compiled; length: number } {
	let length = 0;
	const result = elements.map((element) => {
		if (element.type === TYPE.literal) {
			length += element.value.length;
			return { ...element, value: [...element.value].map((ch) => accented[ch] ?? ch).join('') };
		}
		if (element.type === TYPE.plural || element.type === TYPE.select) {
			const options = Object.fromEntries(
				Object.entries(element.options).map(([selector, option]) => {
					const inner = transform(option.value);
					length = Math.max(length, inner.length);
					return [selector, { ...option, value: inner.elements }];
				})
			);
			return { ...element, options };
		}
		if (element.type === TYPE.tag) {
			const inner = transform(element.children);
			length += inner.length;
			return { ...element, children: inner.elements };
		}
		return element;
	});
	return { elements: result as Compiled, length };
}

export function pseudolocalize(message: Compiled): Compiled {
	const { elements, length } = transform(message);
	const padding = '~'.repeat(Math.max(1, Math.ceil(length * 0.35)));
	return [
		{ type: TYPE.literal, value: '[' },
		...elements,
		{ type: TYPE.literal, value: ` ${padding}]` }
	];
}
