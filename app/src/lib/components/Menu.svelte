<script lang="ts">
	import { resolve } from '$app/paths';
	import { Menu as ArkMenu } from '@ark-ui/svelte/menu';

	interface Item {
		value: string;
		label: string;
		href?: string;
		formAction?: string;
		onSelect?: () => void;
	}

	interface Props {
		label: string;
		items: Item[];
	}

	let { label, items }: Props = $props();
</script>

<div class="menu-wrapper">
	<ArkMenu.Root>
		<ArkMenu.Trigger>{label}</ArkMenu.Trigger>
		<ArkMenu.Positioner>
			<ArkMenu.Content aria-label={label}>
				{#each items as item (item.value)}
					{#if item.href}
						<ArkMenu.Item value={item.value}>
							<!-- The wrapper receives dynamic local paths; Kit's route overloads only type literals. -->
							{#snippet asChild(props)}<a {...props()} href={resolve(item.href as 'profile')}
									>{item.label}</a
								>{/snippet}
						</ArkMenu.Item>
					{:else if item.formAction}
						<form method="POST" action={item.formAction}>
							<ArkMenu.Item value={item.value}>
								{#snippet asChild(props)}<button {...props()} type="submit">{item.label}</button
									>{/snippet}
							</ArkMenu.Item>
						</form>
					{:else}
						<ArkMenu.Item value={item.value} onSelect={item.onSelect}>{item.label}</ArkMenu.Item>
					{/if}
				{/each}
			</ArkMenu.Content>
		</ArkMenu.Positioner>
	</ArkMenu.Root>
</div>

<style>
	.menu-wrapper :global([data-scope='menu'][data-part='trigger']) {
		min-block-size: 2.75rem;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		color: var(--color-text);
		font: inherit;
	}

	.menu-wrapper :global([data-scope='menu'][data-part='content']) {
		min-inline-size: 10rem;
		padding: var(--space-1);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		box-shadow: var(--shadow-raised);
	}

	.menu-wrapper :global([data-scope='menu'][data-part='item']) {
		display: block;
		padding: var(--space-2);
		border-radius: var(--radius-control);
		color: var(--color-text);
		text-decoration: none;
		cursor: pointer;
	}

	.menu-wrapper :global([data-scope='menu'][data-part='item'][data-highlighted]) {
		background: var(--color-primary-soft);
	}
</style>
