<script lang="ts">
	import AppLocaleProvider from './AppLocaleProvider.svelte';
	import Field from './Field.svelte';
	import PasswordInput from './PasswordInput.svelte';
	import Select from './Select.svelte';
	import { setI18n, type I18n } from '#lib/i18n/t.ts';

	let { locale }: { locale: string } = $props();
	setI18n({
		get locale() {
			return locale;
		},
		t: ((key: string) => key) as I18n['t']
	});
</script>

<AppLocaleProvider {locale}>
	<form>
		<Field name="name" label="Name" hint="Help" error="Error" />
		<Select name="kind" label="Kind" value="adult" options={[{ value: 'adult', label: 'Adult' }]} />
		<PasswordInput name="password" label="Password" />
	</form>
</AppLocaleProvider>
