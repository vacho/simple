<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';

	interface Props extends Omit<HTMLButtonAttributes, 'aria-label'> {
		label: string;
		icon: ComponentProps<typeof Icon>['name'];
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
	}

	let { label, icon, variant = 'ghost', ...rest }: Props = $props();
</script>

<Button aria-label={label} {variant} {...rest}>
	<Icon name={icon} />
</Button>
