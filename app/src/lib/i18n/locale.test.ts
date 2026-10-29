import { describe, expect, it } from 'vitest';
import { matchLocale, parseAcceptLanguage } from './locale.ts';

const match = (header: string, installed = ['en', 'es']) =>
	matchLocale(parseAcceptLanguage(header), installed);

describe('Accept-Language matching', () => {
	it('picks the first installed language in preference order', () => {
		expect(match('fr, es, en')).toBe('es');
	});

	it('finds nothing when no preference is installed', () => {
		expect(match('fr')).toBeUndefined();
	});

	it('sorts by q value', () => {
		expect(match('en;q=0.5, es;q=1')).toBe('es');
	});

	it('drops languages with q=0', () => {
		expect(match('es;q=0, en;q=0.8')).toBe('en');
	});

	it('keeps header order between equal q values', () => {
		expect(match('es;q=0.7, en;q=0.7')).toBe('es');
		expect(match('en;q=0.7, es;q=0.7')).toBe('en');
	});

	it('ignores malformed entries', () => {
		expect(match('not a tag, es;q=abc, en;q=2, *, es-BO')).toBe('es');
	});

	it('falls back to the primary subtag', () => {
		expect(match('ca-ES', ['en', 'ca'])).toBe('ca');
		expect(match('es-BO')).toBe('es');
	});

	it('prefers an exact regional match over the primary subtag', () => {
		expect(match('pt-BR', ['en', 'pt', 'pt-BR'])).toBe('pt-BR');
	});
});
