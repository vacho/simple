<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import { setI18n } from '#lib/i18n/t.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

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
