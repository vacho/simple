<script lang="ts">
	import { onMount } from 'svelte';

	// The browser's time zone, sent with setup and sign-in so a new account gets it (D14). Only the
	// browser knows it, so it is filled in after the page loads.
	let timeZone = $state('');
	onMount(() => {
		timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	});
</script>

<input type="hidden" name="timeZone" value={timeZone} />
