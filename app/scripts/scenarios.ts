// Scenario traceability (D11), without the file system: which scenarios of the specs no test
// quotes. Used by check-scenarios.ts.

export interface Spec {
	capability: string;
	text: string;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The scenario titles of a spec, in order. */
export function scenariosOf(text: string): string[] {
	return [...text.matchAll(/^#### Scenario: (.+)$/gm)].map((match) => match[1].trim());
}

/**
 * Whether a test quotes the scenario: its title followed by a colon, a comma or a closing
 * quote, so "Offline page" is not quoted by a test of "Offline page keeps the user's language".
 */
export function quotes(tests: string, scenario: string): boolean {
	return new RegExp(`${escape(scenario)}[:,'"\`]`).test(tests);
}

/** "<capability>: <scenario>" for each scenario without a test quoting it. */
export function missingScenarios(specs: Spec[], tests: string): string[] {
	return specs.flatMap(({ capability, text }) =>
		scenariosOf(text)
			.filter((scenario) => !quotes(tests, scenario))
			.map((scenario) => `${capability}: ${scenario}`)
	);
}
