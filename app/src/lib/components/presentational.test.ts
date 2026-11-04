import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Badge from './Badge.svelte';
import Button from './Button.svelte';
import Card from './Card.svelte';
import DataList from './DataList.svelte';
import DataListRow from './DataListRow.svelte';
import EmptyState from './EmptyState.svelte';
import Icon from './Icon.svelte';
import IconButton from './IconButton.svelte';
import PageHeader from './PageHeader.svelte';

describe('presentational components', () => {
	it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
		'Button renders the %s variant with an accessible name',
		(variant) => {
			const { body } = render(Button, { props: { variant, 'aria-label': 'Save' } });
			expect(body).toContain(`data-variant="${variant}"`);
			expect(body).toContain('aria-label="Save"');
		}
	);

	it('Button exposes its busy state and cannot submit twice', () => {
		const { body } = render(Button, { props: { busy: true, type: 'submit' } });
		expect(body).toContain('disabled');
		expect(body).toContain('aria-busy="true"');
	});

	it('IconButton names its button and hides the decorative icon', () => {
		const { body } = render(IconButton, { props: { label: 'Add member', icon: 'plus' } });
		expect(body).toContain('aria-label="Add member"');
		expect(body).toContain('aria-hidden="true"');
	});

	it('Card and list components render semantic containers', () => {
		expect(render(Card).body).toContain('<section');
		expect(render(DataList).body).toContain('<ul');
		const row = render(DataListRow, { props: { title: 'Lucia', meta: 'Administrator' } }).body;
		expect(row).toContain('<li');
		expect(row).toContain('Lucia');
		expect(row).toContain('Administrator');
	});

	it('PageHeader and EmptyState render supplied text without built-in English', () => {
		const heading = render(PageHeader, { props: { title: 'Mi casa', subtitle: 'Resumen' } }).body;
		expect(heading).toMatch(/<h1[^>]*>Mi casa<\/h1>/);
		expect(heading).toContain('Resumen');
		const empty = render(EmptyState, {
			props: { title: 'Sin miembros', description: 'Agrega uno.' }
		}).body;
		expect(empty).toContain('Sin miembros');
		expect(empty).toContain('Agrega uno.');
	});

	it.each(['neutral', 'success', 'warning', 'danger', 'info', 'muted'] as const)(
		'Badge without color: Badge renders the %s tone with its text label',
		(tone) => {
			const { body } = render(Badge, { props: { tone, label: 'Archived' } });
			expect(body).toContain(`data-tone="${tone}"`);
			expect(body).toContain('Archived');
		}
	);

	it('Icon hides decorative artwork and mirrors directional names', () => {
		const { body } = render(Icon, { props: { name: 'chevron-right' } });
		expect(body).toContain('aria-hidden="true"');
		expect(body).toContain('icon-directional');
	});

	it('Icon exposes a supplied accessible name', () => {
		const { body } = render(Icon, { props: { name: 'info', label: 'Information' } });
		expect(body).toContain('role="img"');
		expect(body).toContain('aria-label="Information"');
	});
});
