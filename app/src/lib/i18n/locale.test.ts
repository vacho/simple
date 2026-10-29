import { describe, expect, it } from 'vitest';
import { matchLocale, parseAcceptLanguage, resolveLocale, textDirection } from './locale.ts';

const match = (header: string, installed = ['en', 'es']) =>
	matchLocale(parseAcceptLanguage(header), installed);

describe('Accept-Language matching', () => {
	it('Preference order of the browser: the first installed language wins', () => {
		expect(match('fr, es, en')).toBe('es');
	});

	it('finds nothing when no preference is installed', () => {
		expect(match('fr')).toBeUndefined();
	});

	it('sorts by q value', () => {
		expect(match('en;q=0.5, es;q=1')).toBe('es');
	});

	it('Excluded language: q=0 drops it', () => {
		expect(match('es;q=0, en;q=0.8')).toBe('en');
	});

	it('keeps header order between equal q values', () => {
		expect(match('es;q=0.7, en;q=0.7')).toBe('es');
		expect(match('en;q=0.7, es;q=0.7')).toBe('en');
	});

	it('ignores malformed entries', () => {
		expect(match('not a tag, es;q=abc, en;q=2, *, es-BO')).toBe('es');
	});

	it('Regional variants: falls back to the primary subtag', () => {
		expect(match('ca-ES', ['en', 'ca'])).toBe('ca');
		expect(match('es-BO')).toBe('es');
	});

	it('Exact regional language wins over the primary subtag', () => {
		expect(match('pt-BR', ['en', 'pt', 'pt-BR'])).toBe('pt-BR');
	});
});

describe('resolveLocale', () => {
	const installed = ['en', 'es', 'fr'];

	it('uses the saved language when it is installed', () => {
		expect(resolveLocale('es', 'en-US,en;q=0.9', installed)).toBe('es');
	});

	it('follows the browser when no language is saved', () => {
		expect(resolveLocale(null, 'fr-CA, en;q=0.5', installed)).toBe('fr');
	});

	it('follows the browser when the saved language is no longer installed', () => {
		expect(resolveLocale('de', 'es-BO', installed)).toBe('es');
	});

	it('falls back to English when nothing matches', () => {
		expect(resolveLocale(null, 'ja', installed)).toBe('en');
		expect(resolveLocale(null, null, installed)).toBe('en');
	});
});

describe('textDirection', () => {
	it('is rtl for right-to-left languages and ltr otherwise', () => {
		expect(textDirection('ar')).toBe('rtl');
		expect(textDirection('he')).toBe('rtl');
		expect(textDirection('fa-IR')).toBe('rtl');
		expect(textDirection('es-BO')).toBe('ltr');
		expect(textDirection('en')).toBe('ltr');
	});
});
