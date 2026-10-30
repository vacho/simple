<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('settings.title')}</title>
</svelte:head>

<PageHeader
	title={i18n.t('settings.title')}
	subtitle={i18n.t('settings.version', { version: data.overview.version })}
/>

<h2>{i18n.t('settings.sections')}</h2>
<div class="sections">
	<Card><a href={resolve('settings/household')}>{i18n.t('household.settings.title')}</a></Card>
	<Card
		><a href={resolve('settings/member-types')}>{i18n.t('household.member_types.title')}</a></Card
	>
	<Card><a href={resolve('settings/accounts')}>{i18n.t('users.accounts.title')}</a></Card>
</div>

<style>
	.sections {
		display: grid;
		gap: var(--space-3);
	}
</style>
