import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json' with { type: 'json' };
import es from '../../../messages/es.json' with { type: 'json' };
import { formatDate, formatDateTime, formatNumber, formatTime } from './format.ts';
import { createTranslator } from './t.ts';

describe('Language-aware formatting', () => {
	it('Number formatting: 1234.5 is "1,234.5" in English and "1234,5" in Spanish', () => {
		expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
		expect(formatNumber(1234.5, 'es')).toBe('1234,5');
	});
});

describe("Times shown in the user's zone", () => {
	const event = new Date(Date.UTC(2026, 9, 20, 3, 0));

	it('shows 2026-10-20 03:00 UTC as 2026-10-19 23:00 in America/La_Paz', () => {
		const parts = new Intl.DateTimeFormat('en', {
			timeZone: 'America/La_Paz',
			dateStyle: 'short',
			timeStyle: 'short',
			hourCycle: 'h23'
		}).formatToParts(event);
		const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
		expect([part('month'), part('day'), part('hour'), part('minute')]).toEqual([
			'10',
			'19',
			'23',
			'00'
		]);
		expect(formatDate(event, 'es', 'America/La_Paz')).toBe('19 oct 2026');
		expect(formatTime(event, 'es', 'America/La_Paz')).toBe('23:00');
		expect(formatDateTime(event, 'es', 'America/La_Paz')).toBe('19 oct 2026, 23:00');
	});

	it('uses UTC when the user has no zone', () => {
		expect(formatTime(event, 'es', null)).toBe('3:00');
	});
});

describe('Plural forms follow the language', () => {
	const translator = (locale: string, text: string) =>
		createTranslator(locale, {
			'auth.sign_in.locked': new IntlMessageFormat(text, locale).getAst()
		});

	it('uses the right lockout text for 1 and 15 minutes in English and Spanish', () => {
		const english = translator('en', en['auth.sign_in.locked'].text);
		const spanish = translator('es', es['auth.sign_in.locked'].text);
		expect(english('auth.sign_in.locked', { minutes: 1 })).toContain('1 minute.');
		expect(english('auth.sign_in.locked', { minutes: 15 })).toContain('15 minutes.');
		expect(spanish('auth.sign_in.locked', { minutes: 1 })).toContain('1 minuto.');
		expect(spanish('auth.sign_in.locked', { minutes: 15 })).toContain('15 minutos.');
	});

	it('selects the one, few, many and few forms for 1, 3, 5 and 22 in Polish', () => {
		const polish = translator(
			'pl',
			'{minutes, plural, one {# minuta} few {# minuty} many {# minut} other {# minuty (other)}}'
		);
		const forms = [1, 3, 5, 22].map((minutes) => polish('auth.sign_in.locked', { minutes }));
		expect(forms).toEqual(['1 minuta', '3 minuty', '5 minut', '22 minuty']);
	});
});
