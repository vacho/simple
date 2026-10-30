<script lang="ts">
	import Field from '#lib/components/Field.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('household.settings.title')}</title>
</svelte:head>

<h1>{i18n.t('household.settings.title')}</h1>
<p>{i18n.t('household.settings.intro')}</p>

{#if data.saved && !form}
	<p role="status">{i18n.t('household.settings.saved')}</p>
{/if}

<form method="POST" class="stack">
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
	<button type="submit">{i18n.t('household.settings.save')}</button>
</form>

<style>
	.stack {
		display: grid;
		gap: var(--space-3);
		max-inline-size: 28rem;
	}

	.error {
		margin: 0;
	}
</style>
