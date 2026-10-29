<script lang="ts">
	import { getI18n } from '#lib/i18n/t.ts';

	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('shell.home.title')}</title>
</svelte:head>

<h1>{i18n.t('shell.home.title')}</h1>
