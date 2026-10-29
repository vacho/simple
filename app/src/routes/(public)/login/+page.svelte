<script lang="ts">
	import Field from '#lib/components/Field.svelte';
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

<div>
	<h1>{i18n.t('auth.sign_in.title')}</h1>
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
		<Field
			label={i18n.t('users.field.password')}
			name="password"
			type="password"
			autocomplete="current-password"
			required
		/>
		<TimeZoneInput />
		<button type="submit">{i18n.t('auth.sign_in.submit')}</button>
	</form>
</div>
