// Scenario traceability matching (D11).
import { describe, expect, it } from 'vitest';
import { missingScenarios, quotes, scenariosOf } from './scenarios.ts';

const spec = (...titles: string[]) =>
	titles.map((title) => `#### Scenario: ${title}\n- x`).join('\n\n');

describe('scenario traceability', () => {
	it('reads the scenario titles of a spec', () => {
		expect(scenariosOf(spec('Sample scenario', 'Sample scenario keeps going '))).toEqual([
			'Sample scenario',
			'Sample scenario keeps going'
		]);
		expect(scenariosOf('# Nothing here')).toEqual([]);
	});

	it.each([
		["test('Sample scenario: no data', () => {})", true],
		["test('Sample scenario, and Another one: both', () => {})", true],
		["['Sample scenario', '/']", true],
		['test("Sample scenario", () => {})', true],
		['test(`Sample scenario`, () => {})', true],
		["test('Sample scenario keeps going: es', () => {})", false],
		["test('Sample scenarios: plural', () => {})", false],
		['// Sample scenario', false]
	])('quotes %s: %s', (tests, expected) => {
		expect(quotes(tests, 'Sample scenario')).toBe(expected);
	});

	it('treats scenario titles as text, not patterns', () => {
		expect(quotes("test('A (b): c')", 'A (b)')).toBe(true);
		expect(quotes("test('Ax: c')", 'A.')).toBe(false);
	});

	it('names each scenario no test quotes, even when a longer one is quoted', () => {
		const specs = [
			{
				capability: 'some-capability',
				text: spec('Sample scenario', 'Sample scenario keeps going')
			}
		];
		expect(missingScenarios(specs, "test('Sample scenario keeps going: es')")).toEqual([
			'some-capability: Sample scenario'
		]);
		expect(
			missingScenarios(specs, "test('Sample scenario: x'); test('Sample scenario keeps going: es')")
		).toEqual([]);
	});
});
