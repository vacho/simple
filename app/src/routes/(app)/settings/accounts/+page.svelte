<script lang="ts">
	import { getI18n } from '#lib/i18n/t.ts';
	import AccountActions from '../../AccountActions.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('users.accounts.title')}</title>
</svelte:head>

<h1>{i18n.t('users.accounts.title')}</h1>
<p>{i18n.t('users.accounts.intro')}</p>

{#if data.done && !form}
	<p role="status">{i18n.t('users.accounts.done')}</p>
{/if}

<ul class="accounts">
	{#each data.accounts as account (account.id)}
		<li>
			<h2>{account.displayName}</h2>
			{#if account.passwordTemporary}
				<p>{i18n.t('users.account.state_temporary')}</p>
			{/if}
			<AccountActions
				account={{ ...account, userId: account.id }}
				own={account.id === data.ownId}
				confirm={data.confirm}
				{form}
			/>
		</li>
	{/each}
</ul>

<style>
	.accounts {
		display: grid;
		gap: var(--space-4);
		padding: 0;
		list-style: none;
	}

	.accounts li {
		padding-block-end: var(--space-3);
		border-block-end: 1px solid var(--color-border);
	}

	h2 {
		margin-block: 0 var(--space-1);
		font-size: 1.125rem;
	}

	p {
		margin: 0 0 var(--space-1);
	}
</style>
