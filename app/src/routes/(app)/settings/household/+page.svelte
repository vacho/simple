<script lang="ts">
	import Field from '#lib/components/Field.svelte';
	import Card from '#lib/components/Card.svelte';
	import Form from '#lib/components/Form.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('household.settings.title')}</title>
</svelte:head>

<PageHeader
	title={i18n.t('household.settings.title')}
	subtitle={i18n.t('household.settings.intro')}
/>
<div class="stack">
	<Card
		><Form success="household.settings.saved" submitLabel={i18n.t('household.settings.save')}>
			{#if formError(i18n.t, form)}
				<p class="error" role="alert">{formError(i18n.t, form)}</p>
			{/if}
			<Field
				label={i18n.t('household.field.name')}
				name="name"
				defaultValue={form?.values?.name ?? data.household.name ?? ''}
				error={fieldError(i18n.t, form, 'name')}
				required
			/>
		</Form></Card
	>
</div>

<style>
	.stack {
		max-inline-size: 28rem;
	}
	.stack :global(form) {
		display: grid;
		gap: var(--space-3);
	}

	.error {
		margin: 0;
	}
</style>
