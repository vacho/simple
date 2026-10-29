import { translateKey, type Translate } from '../i18n/t.ts';

/** What a form action returns on failure (server/web/responses.ts). */
export interface FormFailure {
	issues?: { field: string; key: string; params: Record<string, string | number> }[];
	error?: { key: string; params: Record<string, string | number> };
	values?: Record<string, string>;
}

/** The translated error of one field, if the failure has one. */
export function fieldError(t: Translate, form: FormFailure | null | undefined, field: string) {
	const issue = form?.issues?.find((entry) => entry.field === field);
	return issue && translateKey(t, issue.key, issue.params);
}

/** The translated form-level error: an issue without a field, or a state error. */
export function formError(t: Translate, form: FormFailure | null | undefined) {
	const issue = form?.issues?.find((entry) => entry.field === '') ?? form?.error;
	return issue && translateKey(t, issue.key, issue.params);
}
