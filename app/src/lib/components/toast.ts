import { createToaster } from '@ark-ui/svelte/toast';

export const toaster = createToaster({ placement: 'bottom-end' });

export function toast(message: string): void {
	toaster.create({ title: message, type: 'success' });
}
