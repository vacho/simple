<script lang="ts">
	import { LocaleProvider } from '@ark-ui/svelte/locale';
	import type { Snippet } from 'svelte';

	interface Props {
		locale: string;
		children: Snippet;
	}

	let { locale, children }: Props = $props();
</script>

<LocaleProvider {locale}>
	{@render children()}
</LocaleProvider>
