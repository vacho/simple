import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Fixture from './ark-controls.fixture.svelte';

describe('Ark control wrappers', () => {
	it.each([
		['en', 'ltr'],
		['es', 'ltr'],
		['ar', 'rtl']
	])('uses %s locale and %s direction', (locale, direction) => {
		const { body } = render(Fixture, { props: { locale } });
		expect(body).toContain(`dir="${direction}"`);
		expect(body).toContain('name="kind"');
		expect(body).toContain('name="password"');
	});

	it('renders a labelled field with hint and error IDs', () => {
		const { body } = render(Fixture, { props: { locale: 'en' } });
		expect(body).toContain('Help');
		expect(body).toContain('Error');
		expect(body).toContain('aria-invalid="true"');
		expect(body).toContain('for="field::s1::control"');
		expect(body).toContain('id="field::s1::helper-text"');
		expect(body).toContain('id="field::s1::error-text"');
	});
});
