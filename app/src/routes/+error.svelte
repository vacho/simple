<script lang="ts">
	import { page } from '$app/state';
	import { getI18n } from '#lib/i18n/t.ts';

	type ErrorKey = 'errors.not_allowed' | 'errors.page_not_found' | 'errors.unexpected';
	const i18n = getI18n();
	// Denials carry their message key (server/web/responses.ts); a missing route is a plain 404.
	const key = $derived.by((): ErrorKey => {
		if (page.error?.key === 'errors.not_allowed') return 'errors.not_allowed';
		return page.status === 404 ? 'errors.page_not_found' : 'errors.unexpected';
	});
</script>

<svelte:head>
	<title>{i18n.t(key)}</title>
</svelte:head>

<h1>{i18n.t(key)}</h1>
