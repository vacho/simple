<script lang="ts">
	let { children } = $props();
</script>

<main class="public">
	{@render children()}
</main>

<style>
	.public {
		max-inline-size: 28rem;
		margin-inline: auto;
		padding: var(--space-5) var(--space-3);
	}

	.public :global(form) {
		display: grid;
		gap: var(--space-3);
	}
</style>
