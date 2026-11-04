<script lang="ts">
	import { page } from '$app/state';
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/t.ts';

	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('shell.home.title')}</title>
</svelte:head>

<PageHeader
	title={page.data.householdName ?? i18n.t('household.unnamed')}
	subtitle={i18n.t('shell.home.title')}
/>
<Card><p>{i18n.t('shell.home.title')}</p></Card>
