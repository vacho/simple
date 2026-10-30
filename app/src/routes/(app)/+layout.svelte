<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const i18n = getI18n();
	const sections = {
		home: { href: resolve(''), label: 'shell.nav.home', icon: 'house' },
		members: { href: resolve('members'), label: 'shell.nav.members', icon: 'users' },
		settings: { href: resolve('settings'), label: 'shell.nav.settings', icon: 'settings' }
	} as const;
</script>

<a class="skip" href="#content">{i18n.t('shell.skip_to_content')}</a>

<div class="frame">
	<header class="top">
		<strong class="household-name">{data.householdName ?? i18n.t('household.unnamed')}</strong>
		<Menu
			label={data.displayName}
			items={[
				{ value: 'profile', label: i18n.t('shell.user_menu.profile'), href: 'profile' },
				{ value: 'sign-out', label: i18n.t('auth.sign_out'), formAction: resolve('logout') }
			]}
		/>
	</header>

	<nav class="nav" aria-label={i18n.t('shell.nav.label')}>
		<ul>
			{#each data.navigation.map((id) => sections[id]) as section (section.href)}
				<li>
					<a
						href={section.href}
						aria-current={page.url.pathname === section.href ? 'page' : undefined}
					>
						<Icon name={section.icon} />
						{i18n.t(section.label)}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<main id="content" tabindex="-1">
		{@render children()}
	</main>
</div>

<style>
	.skip {
		position: absolute;
		inset-inline-start: var(--space-2);
		inset-block-start: -10rem;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg);
		z-index: 2;
	}

	.skip:focus {
		inset-block-start: var(--space-2);
	}

	.frame {
		display: grid;
		grid-template-areas: 'top' 'main';
		grid-template-rows: auto 1fr;
		min-block-size: 100dvh;
	}

	.top {
		grid-area: top;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border-block-end: 1px solid var(--color-border);
	}

	.household-name {
		font-size: var(--text-lg);
	}

	main {
		grid-area: main;
		min-inline-size: 0;
		padding: var(--space-3);
		/* Room for the bottom navigation bar on narrow screens. */
		padding-block-end: calc(var(--nav-size) + var(--space-3));
	}

	main:focus {
		outline: none;
	}

	.nav {
		position: fixed;
		inset-inline: 0;
		inset-block-end: 0;
		block-size: var(--nav-size);
		background: var(--color-surface);
		border-block-start: 1px solid var(--color-border);
		z-index: 1;
	}

	.nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav ul {
		display: flex;
		justify-content: space-around;
		align-items: center;
		block-size: 100%;
	}

	.nav a {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		color: var(--color-text);
		text-decoration: none;
	}

	.nav a[aria-current='page'] {
		color: var(--color-primary);
		font-weight: var(--weight-strong);
	}

	@media (min-width: 1024px) {
		.frame {
			grid-template-areas: 'nav top' 'nav main';
			grid-template-columns: var(--side-nav-size) 1fr;
		}

		.nav {
			grid-area: nav;
			position: sticky;
			inset-block-start: 0;
			block-size: 100dvh;
			border-block-start: none;
			border-inline-end: 1px solid var(--color-border);
		}

		.nav ul {
			flex-direction: column;
			justify-content: flex-start;
			align-items: stretch;
			padding-block: var(--space-3);
		}

		main {
			padding-block-end: var(--space-3);
		}
	}
</style>
