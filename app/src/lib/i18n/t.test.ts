import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, it } from 'vitest';
import { createTranslator, type Dictionary } from './t.ts';

// Message trees as the server precompiles them.
const parse = (text: string) => new IntlMessageFormat(text, 'es').getAst();

const dictionary: Dictionary = {
	'shell.home.title': parse('Inicio'),
	'auth.sign_in.locked': parse(
		'Vuelve a intentarlo en {minutes, plural, one {# minuto} other {# minutos}}.'
	)
};
const t = createTranslator('es', dictionary);

describe('translator', () => {
	it('renders precompiled messages with their parameters', () => {
		expect(t('shell.home.title')).toBe('Inicio');
		expect(t('auth.sign_in.locked', { minutes: 1 })).toBe('Vuelve a intentarlo en 1 minuto.');
		expect(t('auth.sign_in.locked', { minutes: 15 })).toBe('Vuelve a intentarlo en 15 minutos.');
	});

	it('rejects unknown keys and missing parameters at compile time', () => {
		// These lines must not compile; svelte-check fails if one of them ever does.
		// @ts-expect-error unknown key
		expect(t('shell.unknown')).toBe('shell.unknown');
		// @ts-expect-error missing parameters
		expect(() => t('auth.sign_in.locked')).toThrow();
		// @ts-expect-error wrong parameter name
		expect(() => t('auth.sign_in.locked', { count: 1 })).toThrow();
		// @ts-expect-error parameters on a message without any
		t('shell.home.title', { minutes: 1 });
	});
});
