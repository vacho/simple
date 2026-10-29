import { describe, expect, it } from 'vitest';
import { languageOptions, timeZoneOptions } from './profile-options.ts';

describe('Language names in their own language', () => {
	it('names each installed language in itself, capitalized', () => {
		expect(languageOptions(['en', 'es', 'fr', 'ca'])).toEqual([
			{ code: 'en', name: 'English' },
			{ code: 'es', name: 'Español' },
			{ code: 'fr', name: 'Français' },
			{ code: 'ca', name: 'Català' }
		]);
	});
});

describe('time zone options', () => {
	it('lists UTC first, then the zones Intl knows', () => {
		const zones = timeZoneOptions(null);
		expect(zones[0]).toBe('UTC');
		expect(zones).toContain('America/La_Paz');
		expect(zones.filter((zone) => zone === 'UTC')).toHaveLength(1);
	});

	it('keeps the current zone selectable, even when Intl does not list it', () => {
		expect(timeZoneOptions('Asia/Calcutta')).toContain('Asia/Calcutta');
		expect(
			timeZoneOptions('America/La_Paz').filter((zone) => zone === 'America/La_Paz')
		).toHaveLength(1);
	});
});
