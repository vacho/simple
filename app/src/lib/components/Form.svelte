<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import { toast } from './toast.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { MessageKey, MessageParams } from '#lib/i18n/keys.ts';

	type MessageWithoutParams = {
		[K in MessageKey]: MessageParams[K] extends undefined ? K : never;
	}[MessageKey];

	interface Props {
		action?: string;
		success: MessageWithoutParams;
		submitLabel: string;
		children?: Snippet;
		onSuccess?: () => void;
		onResult?: () => void;
		variant?: 'primary' | 'danger';
	}

	let {
		action,
		success,
		submitLabel,
		children,
		onSuccess,
		onResult,
		variant = 'primary'
	}: Props = $props();
	let busy = $state(false);
	const i18n = getI18n();

	const submit: SubmitFunction = () => {
		busy = true;
		return async ({ result, update }) => {
			busy = false;
			onResult?.();
			if (result.type === 'success' || result.type === 'redirect') {
				toast(i18n.t(success));
				onSuccess?.();
			}
			await update();
		};
	};
</script>

<form method="POST" {action} use:enhance={submit}>
	{@render children?.()}
	<Button type="submit" {busy} {variant}>{submitLabel}</Button>
</form>

<style>
	form {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-3);
	}
</style>
