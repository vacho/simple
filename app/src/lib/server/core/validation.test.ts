import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { Invalid } from './errors.ts';
import { parseInput } from './validation.ts';

const schema = v.object({ name: v.pipe(v.string(), v.trim(), v.minLength(1, 'users.name.empty')) });

describe('parseInput', () => {
	it('returns the parsed output', () => {
		expect(parseInput(schema, { name: '  Ana ' })).toEqual({ name: 'Ana' });
	});

	it('throws Invalid carrying message keys', () => {
		try {
			parseInput(schema, { name: '   ' });
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(Invalid);
			expect((error as Invalid).issues).toEqual([
				{ field: 'name', key: 'users.name.empty', params: { requirement: 1 } }
			]);
		}
	});
});
