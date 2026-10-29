<script lang="ts">
	// No navigation: while the password is temporary, nothing else opens (ADR 0027).
	let { children } = $props();
</script>

<main class="password">
	{@render children()}
</main>

<style>
	.password {
		max-inline-size: 28rem;
		margin-inline: auto;
		padding: var(--space-5) var(--space-3);
	}

	.password :global(form) {
		display: grid;
		gap: var(--space-3);
	}
</style>
