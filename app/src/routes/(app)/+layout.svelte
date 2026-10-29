<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const i18n = getI18n();
	const sections = {
		home: { href: resolve(''), label: 'shell.nav.home' },
		settings: { href: resolve('settings'), label: 'shell.nav.settings' }
	} as const;
</script>

<a class="skip" href="#content">{i18n.t('shell.skip_to_content')}</a>

<div class="frame">
	<header class="top">
		<details class="user-menu">
			<summary>{data.displayName}</summary>
			<ul>
				<li><a href={resolve('profile')}>{i18n.t('shell.user_menu.profile')}</a></li>
				<li>
					<form method="POST" action="/logout">
						<button type="submit">{i18n.t('auth.sign_out')}</button>
					</form>
				</li>
			</ul>
		</details>
	</header>

	<nav class="nav" aria-label={i18n.t('shell.nav.label')}>
		<ul>
			{#each data.navigation.map((id) => sections[id]) as section (section.href)}
				<li>
					<a
						href={section.href}
						aria-current={page.url.pathname === section.href ? 'page' : undefined}
					>
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
		justify-content: flex-end;
		padding: var(--space-2) var(--space-3);
		border-block-end: 1px solid var(--color-border);
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

	.nav ul,
	.user-menu ul {
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
		display: block;
		padding: var(--space-2) var(--space-3);
		color: var(--color-text);
		text-decoration: none;
	}

	.nav a[aria-current='page'] {
		color: var(--color-primary);
		font-weight: 600;
	}

	.user-menu {
		position: relative;
	}

	.user-menu summary {
		cursor: pointer;
		padding: var(--space-2);
	}

	.user-menu ul {
		position: absolute;
		inset-inline-end: 0;
		min-inline-size: 12rem;
		padding: var(--space-2);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		z-index: 3;
	}

	.user-menu li + li {
		margin-block-start: var(--space-2);
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
