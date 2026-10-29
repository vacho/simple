// Server-side message compilation (D14): the parser runs here once per text; the browser only
// renders the resulting trees.
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';

export type Compiled = MessageFormatElement[];

export function compile(text: string): Compiled {
	return parse(text);
}

// The same walk as scripts/messages.ts, which may not import a feature (ADR 0008).
function argumentsOf(elements: Compiled, found = new Map<string, TYPE>()): Map<string, TYPE> {
	for (const element of elements) {
		if (element.type !== TYPE.literal && element.type !== TYPE.pound) {
			found.set(element.value, element.type);
		}
		if ('options' in element) {
			for (const option of Object.values(element.options)) argumentsOf(option.value, found);
		}
		if (element.type === TYPE.tag) argumentsOf(element.children, found);
	}
	return found;
}

/**
 * Whether a translation renders with the arguments the code passes for the English text: every
 * argument it uses must exist in English with the same kind (simple, number, date, plural...).
 */
export function isCompatible(translation: Compiled, english: Compiled): boolean {
	const expected = argumentsOf(english);
	return [...argumentsOf(translation)].every(([name, type]) => expected.get(name) === type);
}
