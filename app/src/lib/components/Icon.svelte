<script lang="ts">
	import Archive from '@lucide/svelte/icons/archive';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import House from '@lucide/svelte/icons/house';
	import Info from '@lucide/svelte/icons/info';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Menu from '@lucide/svelte/icons/menu';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings from '@lucide/svelte/icons/settings';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Users from '@lucide/svelte/icons/users';
	import Wallet from '@lucide/svelte/icons/wallet';
	import X from '@lucide/svelte/icons/x';

	const icons = {
		archive: Archive,
		'arrow-left': ArrowLeft,
		'arrow-right': ArrowRight,
		'chevron-right': ChevronRight,
		'circle-check': CircleCheck,
		eye: Eye,
		'eye-off': EyeOff,
		house: House,
		info: Info,
		'key-round': KeyRound,
		'log-out': LogOut,
		menu: Menu,
		plus: Plus,
		settings: Settings,
		'trash-2': Trash2,
		'triangle-alert': TriangleAlert,
		'user-round': UserRound,
		users: Users,
		wallet: Wallet,
		x: X
	};

	interface Props {
		name: keyof typeof icons;
		label?: string;
		size?: number;
	}

	let { name, label, size = 20 }: Props = $props();
	let CurrentIcon = $derived(icons[name]);
	let directional = $derived(
		name === 'arrow-left' || name === 'arrow-right' || name === 'chevron-right'
	);
</script>

<CurrentIcon
	{size}
	strokeWidth={2}
	class={directional ? 'icon-directional' : undefined}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
/>
