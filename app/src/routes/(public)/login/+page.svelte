<script lang="ts">
	import Field from '#lib/components/Field.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import TimeZoneInput from '../TimeZoneInput.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('auth.sign_in.title')}</title>
</svelte:head>

<Card>
	<PageHeader title={i18n.t('auth.sign_in.title')} />
	<form method="POST">
		{#if formError(i18n.t, form)}
			<p class="error" role="alert">{formError(i18n.t, form)}</p>
		{/if}
		<Field
			label={i18n.t('users.field.username')}
			name="username"
			autocomplete="username"
			autocapitalize="none"
			required
			defaultValue={form?.values?.username ?? ''}
		/>
		<PasswordInput
			label={i18n.t('users.field.password')}
			name="password"
			autoComplete="current-password"
			required
		/>
		<TimeZoneInput />
		<Button type="submit">{i18n.t('auth.sign_in.submit')}</Button>
	</form>
</Card>
