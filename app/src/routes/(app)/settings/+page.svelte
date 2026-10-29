<script lang="ts">
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
