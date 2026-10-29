// Household input rules, client-safe so forms and the service share one implementation. Names
// follow the display name rules (spec household); messages are message keys (D16).
import * as v from 'valibot';
import { baseClasses } from './base-classes.ts';

const codePoints = (text: string) => [...text].length;

/** A household, member type or member name: trimmed, NFKC, 1 to 64 code points. */
export const name = v.pipe(
	v.string(),
	v.transform((value) => value.trim().normalize('NFKC')),
	v.check((value) => codePoints(value) > 0, 'household.name.empty'),
	v.check((value) => codePoints(value) <= 64, 'household.name.too_long'),
	v.check((value) => !/\p{Cc}/u.test(value), 'household.name.control_characters')
);

/** The key that makes names unique ignoring case, in any script (design D1). */
export function nameKey(value: string): string {
	return value.trim().normalize('NFKC').toLowerCase();
}

/** A UUIDv7, the ID of household data a device may generate (ADR 0007). */
export const id = v.pipe(
	v.string(),
	v.transform((value) => value.toLowerCase()),
	v.regex(
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		'household.id.invalid'
	)
);

export const baseClass = v.picklist(baseClasses, 'household.base_class.invalid');

export const householdName = v.object({ name });
export const newMemberType = v.object({ id, name, baseClass });
export const memberTypeChanges = v.partial(v.object({ name, baseClass }));
export const newMember = v.object({ id, name, memberTypeId: id });
export const memberChanges = v.partial(v.object({ name, memberTypeId: id }));
