// Client-safe mapping of Valibot issues to message keys (D16). Schemas pass a message key as
// each check's message (v.minLength(3, 'users.username.too_short')); the requirement becomes
// the {requirement} parameter. A check without a key falls back to validation.invalid, so no
// library text in English ever reaches the user.
import { getDotPath, type BaseIssue } from 'valibot';

/** One failed input field, as a message key with its parameters. */
export interface Issue {
	/** Dotted path of the field, empty for the whole input. */
	field: string;
	key: string;
	params: Record<string, string | number>;
}

const messageKey = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

export function toIssues(issues: readonly BaseIssue<unknown>[]): Issue[] {
	return issues.map((issue) => {
		const { requirement } = issue;
		const params: Issue['params'] =
			typeof requirement === 'number' || typeof requirement === 'string' ? { requirement } : {};
		return {
			field: getDotPath(issue) ?? '',
			key: messageKey.test(issue.message) ? issue.message : 'validation.invalid',
			params
		};
	});
}
