<script lang="ts">
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('auth.password.title')}</title>
</svelte:head>

<Card>
	<PageHeader title={i18n.t('auth.password.title')} subtitle={i18n.t('auth.password.intro')} />

	<form method="POST">
		{#if formError(i18n.t, form)}
			<p class="error" role="alert">{formError(i18n.t, form)}</p>
		{/if}
		<PasswordInput
			label={i18n.t('auth.password.new')}
			name="password"
			autoComplete="new-password"
			error={fieldError(i18n.t, form, 'password')}
			required
		/>
		<PasswordInput
			label={i18n.t('auth.password.confirm')}
			name="confirm"
			autoComplete="new-password"
			error={fieldError(i18n.t, form, 'confirm')}
			required
		/>
		<Button type="submit">{i18n.t('auth.password.save')}</Button>
	</form>

	<form method="POST" action="/logout">
		<Button type="submit" variant="ghost">{i18n.t('auth.sign_out')}</Button>
	</form>
</Card>
