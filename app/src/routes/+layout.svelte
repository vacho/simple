<script lang="ts">
	import '#lib/components/base.css';
	import favicon from '#lib/assets/favicon.svg';
	import { setI18n } from '#lib/i18n/t.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// The service worker keeps the language last used here, for its offline page (D9). ready
	// resolves once a worker is active, even on the first visit before it controls the page.
	$effect(() => {
		const locale = data.locale;
		navigator.serviceWorker?.ready.then((registration) =>
			registration.active?.postMessage({ type: 'locale', locale })
		);
	});

	setI18n({
		get locale() {
			return data.locale;
		},
		get t() {
			return data.t;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
