<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import DataList from '#lib/components/DataList.svelte';
	import DataListRow from '#lib/components/DataListRow.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Field from '#lib/components/Field.svelte';
	import Form from '#lib/components/Form.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import IconButton from '#lib/components/IconButton.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import Select from '#lib/components/Select.svelte';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import { toast } from '#lib/components/toast.ts';
	import { getI18n, translateKey } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	const i18n = getI18n();
	const tones = ['neutral', 'success', 'warning', 'danger', 'info', 'muted'] as const;
	const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
	const colors = [
		'bg',
		'surface',
		'surface-raised',
		'text',
		'text-muted',
		'border',
		'primary',
		'on-primary',
		'primary-soft',
		'success',
		'success-soft',
		'warning',
		'warning-soft',
		'danger',
		'danger-soft',
		'on-danger',
		'info',
		'info-soft',
		'focus'
	] as const;
	const pairs = [
		['text', 'bg'],
		['text-muted', 'surface'],
		['primary', 'primary-soft'],
		['success', 'success-soft'],
		['warning', 'warning-soft'],
		['danger', 'danger-soft'],
		['info', 'info-soft'],
		['on-primary', 'primary'],
		['on-danger', 'danger']
	] as const;
	const typeScale = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const;
	let rtl = $derived(page.url.searchParams.get('dir') === 'rtl');
	let formError = $derived(form && 'fieldError' in form ? form.fieldError : undefined);
</script>

<svelte:head><title>{i18n.t('shell.dev.catalog.title')}</title></svelte:head>

<div class="catalog" dir={rtl ? 'rtl' : undefined}>
	<PageHeader
		title={i18n.t('shell.dev.catalog.title')}
		subtitle={i18n.t('shell.dev.catalog.intro')}
	/>
	<a href={rtl ? resolve('dev/components?dir=ltr') : resolve('dev/components?dir=rtl')}
		><code>dir={rtl ? 'ltr' : 'rtl'}</code></a
	>

	<section aria-label="Button">
		<h2><code>Button · IconButton</code></h2>
		<div class="examples">
			{#each variants as variant (variant)}
				<Button {variant}>{i18n.t('household.settings.save')}</Button>
			{/each}
			<Button size="sm">{i18n.t('household.settings.save')}</Button>
			<Button disabled>{i18n.t('household.settings.save')}</Button>
			<Button busy>{i18n.t('household.settings.save')}</Button>
			{#each variants as variant (variant)}
				<IconButton icon="plus" {variant} label={i18n.t('household.members.create')} />
			{/each}
			<IconButton icon="plus" disabled label={i18n.t('household.members.create')} />
		</div>
	</section>

	<section aria-label="Badge">
		<h2><code>Badge</code></h2>
		<div class="examples">
			{#each tones as tone (tone)}
				<Badge {tone} label={i18n.t('household.member.state_archived')} />
			{/each}
		</div>
	</section>

	<section aria-label="Card">
		<h2><code>Card · PageHeader</code></h2>
		<Card
			><PageHeader
				title={i18n.t('household.members.title')}
				subtitle={i18n.t('household.settings.intro')}
			>
				{#snippet action()}<Button>{i18n.t('household.members.create')}</Button>{/snippet}
			</PageHeader></Card
		>
	</section>

	<section aria-label="EmptyState">
		<h2><code>EmptyState</code></h2>
		<EmptyState
			title={i18n.t('household.members.title')}
			description={i18n.t('household.members.empty')}
		>
			{#snippet action()}<Button>{i18n.t('household.members.create')}</Button>{/snippet}
		</EmptyState>
		<EmptyState
			title={i18n.t('household.member_types.title')}
			description={i18n.t('household.member_types.empty')}
		>
			{#snippet icon()}<Icon name="info" />{/snippet}
		</EmptyState>
	</section>

	<section aria-label="DataList">
		<h2><code>DataList · DataListRow</code></h2>
		<DataList>
			<DataListRow
				title={i18n.t('household.members.title')}
				meta={i18n.t('household.members.account', { username: 'ana' })}
			>
				{#snippet trailing()}<Badge
						tone="success"
						label={i18n.t('users.account.state_active')}
					/>{/snippet}
			</DataListRow>
			<DataListRow title={i18n.t('household.member_types.title')} muted>
				{#snippet titleLink()}<a href={resolve('settings/member-types')}
						>{i18n.t('household.member_types.title')}</a
					>{/snippet}
			</DataListRow>
		</DataList>
	</section>

	<section aria-label="Icon">
		<h2><code>Icon</code></h2>
		<div class="examples">
			<Icon name="house" /><Icon name="chevron-right" /><Icon
				name="info"
				label={i18n.t('shell.dev.catalog.title')}
			/>
		</div>
	</section>

	<section aria-label="Field, Select, PasswordInput">
		<h2><code>Field · Select · PasswordInput</code></h2>
		<Card>
			<form method="POST" action="?/sample">
				<Field
					name="sample"
					label={i18n.t('household.field.name')}
					hint={i18n.t('household.settings.intro')}
				/>
				<Field
					name="invalid-sample"
					label={i18n.t('household.field.name')}
					error={i18n.t('household.name.taken')}
				/>
				<Field name="disabled-sample" label={i18n.t('household.field.name')} disabled />
				<Select
					name="selection"
					label={i18n.t('household.field.base_class')}
					value="adult"
					options={[
						{ value: 'adult', label: i18n.t('household.base_class.adult') },
						{ value: 'minor', label: i18n.t('household.base_class.minor') }
					]}
				/>
				<Select
					name="disabled-selection"
					label={i18n.t('household.field.base_class')}
					options={[{ value: 'adult', label: i18n.t('household.base_class.adult') }]}
					disabled
				/>
				<Select
					name="invalid-selection"
					label={i18n.t('household.field.base_class')}
					options={[{ value: 'adult', label: i18n.t('household.base_class.adult') }]}
					error={i18n.t('household.base_class.invalid')}
				/>
				<PasswordInput
					name="sample-password"
					label={i18n.t('auth.password.new')}
					autoComplete="new-password"
				/>
				<PasswordInput
					name="invalid-password"
					label={i18n.t('auth.password.confirm')}
					error={i18n.t('auth.password.mismatch')}
				/>
				<Button type="submit">{i18n.t('household.settings.save')}</Button>
			</form>
			{#if form}<pre data-form-result>{JSON.stringify(form)}</pre>{/if}
		</Card>
	</section>

	<section aria-label="Form">
		<h2><code>Form</code></h2>
		<div class="examples">
			<Card>
				<Form
					action="?/save"
					success="household.settings.saved"
					submitLabel={i18n.t('household.settings.save')}
				>
					<Field name="saved-name" label={i18n.t('household.field.name')} />
				</Form>
			</Card>
			<Card>
				<Form
					action="?/fail"
					success="household.settings.saved"
					submitLabel={i18n.t('household.member.save')}
				>
					<Field
						name="failed-name"
						label={i18n.t('household.field.name')}
						error={formError ? translateKey(i18n.t, formError) : undefined}
					/>
				</Form>
			</Card>
			<Card>
				<Form
					action="?/redirect"
					success="household.settings.saved"
					submitLabel={i18n.t('household.member_types.save')}
				>
					<Field name="redirect-name" label={i18n.t('household.field.name')} />
				</Form>
			</Card>
		</div>
		{#if page.url.searchParams.get('result') === 'redirect'}<p data-redirect-result>
				redirect
			</p>{/if}
	</section>

	<section aria-label="Dialog, ConfirmDialog, Menu, Tooltip, Toaster">
		<h2><code>Dialog · ConfirmDialog · Menu · Tooltip · Toaster</code></h2>
		<div class="examples">
			<Dialog
				triggerLabel={i18n.t('household.members.create')}
				title={i18n.t('household.members.title')}
				description={i18n.t('household.members.empty')}
				closeLabel={i18n.t('household.action.cancel')}
			/>
			<ConfirmDialog
				triggerLabel={i18n.t('household.action.delete')}
				title={i18n.t('household.dialog.delete_type.title', { name: 'Vecino' })}
				description={i18n.t('household.confirm.delete_type', { name: 'Vecino' })}
				cancelLabel={i18n.t('household.action.cancel')}
				actionLabel={i18n.t('household.action.delete')}
			/>
			<Menu
				label="Ana Pérez"
				items={[
					{ value: 'profile', label: i18n.t('shell.user_menu.profile'), href: 'profile' },
					{ value: 'sign-out', label: i18n.t('auth.sign_out') }
				]}
			/>
			<Tooltip label={i18n.t('shell.nav.home')} content={i18n.t('household.settings.intro')} />
			<Button onclick={() => toast(i18n.t('household.settings.saved'))}
				>{i18n.t('household.settings.save')}</Button
			>
		</div>
	</section>

	<section aria-label="Color tokens">
		<h2><code>Color tokens</code></h2>
		<div class="swatches">
			{#each colors as color (color)}
				<div class="swatch">
					<span style:background-color={`var(--color-${color})`}></span><code>--color-{color}</code>
				</div>
			{/each}
		</div>
		<div class="pairs">
			{#each pairs as [foreground, background] (foreground)}
				<p
					style:color={`var(--color-${foreground})`}
					style:background-color={`var(--color-${background})`}
				>
					<code>{foreground} / {background}</code>
				</p>
			{/each}
		</div>
	</section>

	<section aria-label="Type scale">
		<h2><code>Type scale</code></h2>
		{#each typeScale as size (size)}
			<p style:font-size={`var(--text-${size})`}>
				<code>--text-{size}</code>
				{i18n.t('shell.dev.catalog.title')} 0123456789
			</p>
		{/each}
	</section>
</div>

<style>
	.catalog {
		display: grid;
		gap: var(--space-5);
	}

	.examples,
	.swatches,
	.pairs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.swatch {
		display: grid;
		gap: var(--space-1);
	}

	.swatch span {
		inline-size: 8rem;
		block-size: 3rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
	}

	.pairs p {
		margin: 0;
		padding: var(--space-2);
		border-radius: var(--radius-control);
	}
</style>
