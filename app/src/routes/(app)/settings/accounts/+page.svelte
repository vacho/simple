<script lang="ts">
	import DataList from '#lib/components/DataList.svelte';
	import DataListRow from '#lib/components/DataListRow.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/t.ts';
	import AccountActions from '../../AccountActions.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head><title>{i18n.t('users.accounts.title')}</title></svelte:head>
<PageHeader title={i18n.t('users.accounts.title')} subtitle={i18n.t('users.accounts.intro')} />
<DataList>
	{#each data.accounts as account (account.id)}
		<DataListRow title={account.displayName} muted={!account.active}>
			{#snippet titleLink()}<h2>{account.displayName}</h2>{/snippet}
			{#snippet trailing()}
				<AccountActions
					account={{ ...account, userId: account.id }}
					own={account.id === data.ownId}
					{form}
				/>
			{/snippet}
		</DataListRow>
	{/each}
</DataList>
