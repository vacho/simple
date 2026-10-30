<script lang="ts">
	import { resolve } from '$app/paths';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('settings.title')}</title>
</svelte:head>

<h1>{i18n.t('settings.title')}</h1>
<p>{i18n.t('settings.version', { version: data.overview.version })}</p>

<h2>{i18n.t('settings.sections')}</h2>
<ul>
	<li><a href={resolve('settings/household')}>{i18n.t('household.settings.title')}</a></li>
	<li><a href={resolve('settings/member-types')}>{i18n.t('household.member_types.title')}</a></li>
	<li><a href={resolve('settings/accounts')}>{i18n.t('users.accounts.title')}</a></li>
</ul>
