// App errors to SvelteKit responses (D6, D16). Missing and forbidden records render the same
// 403, so a denial never reveals whether something exists.
import { error, fail, type ActionFailure } from '@sveltejs/kit';
import {
	AppError,
	Conflict,
	Forbidden,
	Invalid,
	NotFound,
	Throttled,
	type Issue
} from '../core/errors.ts';

export interface FailureData {
	/** Field issues of invalid input. */
	issues?: Issue[];
	/** The form-level error. */
	error?: { key: string; params: Record<string, string | number> };
	/** What the user entered, to fill the form again (never passwords). */
	values?: Record<string, string>;
}

const notAllowed = { status: 403, message: 'Not allowed', key: 'errors.not_allowed' } as const;

function status(appError: AppError): number {
	if (appError instanceof Invalid) return 400;
	if (appError instanceof Throttled) return 429;
	if (appError instanceof Conflict) return 409;
	return notAllowed.status;
}

const isDenial = (appError: AppError) =>
	appError instanceof Forbidden || appError instanceof NotFound;

/** For page and layout loads: every app error becomes SvelteKit's error page. */
export function throwForLoad(caught: unknown): never {
	if (!(caught instanceof AppError)) throw caught;
	if (isDenial(caught)) error(notAllowed.status, notAllowed.message, { key: notAllowed.key });
	error(status(caught), caught.message, { key: caught.key });
}

/**
 * For form actions: input and state problems become a form failure, with the values to fill the
 * form again; denials, the error page.
 */
export function failForAction(
	caught: unknown,
	values?: Record<string, string>
): ActionFailure<FailureData> {
	if (!(caught instanceof AppError)) throw caught;
	if (isDenial(caught)) error(notAllowed.status, notAllowed.message, { key: notAllowed.key });
	if (caught instanceof Invalid) return fail(400, { issues: caught.issues, values });
	return fail(status(caught), { error: { key: caught.key, params: caught.params }, values });
}

/** For endpoints: a JSON body with the stable code and the message key, never protected data. */
export function errorResponse(caught: unknown): Response {
	if (!(caught instanceof AppError)) throw caught;
	if (isDenial(caught)) {
		return Response.json(
			{ code: 'not_allowed', key: notAllowed.key },
			{ status: notAllowed.status }
		);
	}
	const issues = caught instanceof Invalid ? { issues: caught.issues } : {};
	return Response.json(
		{ code: caught.code, key: caught.key, params: caught.params, ...issues },
		{ status: status(caught) }
	);
}
