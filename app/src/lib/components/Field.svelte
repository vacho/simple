<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label: string;
		name: string;
		/** Translated error shown under the input. */
		error?: string;
	}

	let { label, name, error, ...input }: Props = $props();
	const id = $props.id();
</script>

<div class="field">
	<label for="{id}-input">{label}</label>
	<input
		id="{id}-input"
		{name}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${id}-error` : undefined}
		{...input}
	/>
	{#if error}
		<p id="{id}-error" class="error">{error}</p>
	{/if}
</div>

<style>
	.field {
		display: grid;
		gap: var(--space-1);
	}

	label {
		font-weight: 600;
	}

	.error {
		margin: 0;
	}
</style>
