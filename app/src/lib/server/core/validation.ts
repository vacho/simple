// Validation always runs in the service (D16): parse input with a feature's schema, or throw
// Invalid with the issues as message keys.
import * as v from 'valibot';
import { toIssues } from '../../validation/issues.ts';
import { Invalid } from './errors.ts';

export function parseInput<const S extends v.GenericSchema>(
	schema: S,
	input: unknown
): v.InferOutput<S> {
	const result = v.safeParse(schema, input);
	if (!result.success) throw new Invalid(toIssues(result.issues));
	return result.output;
}
