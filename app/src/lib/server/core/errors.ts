// Typed application errors (D16). They carry message keys and parameters, never text: each
// adapter renders them (translated text in the UI, stable codes in a future API).

import type { Issue } from '../../validation/issues.ts';

export type { Issue };
export type ErrorParams = Record<string, string | number>;

export abstract class AppError extends Error {
	abstract readonly code: string;

	constructor(
		readonly key: string,
		readonly params: ErrorParams = {}
	) {
		super(key);
		this.name = new.target.name;
	}
}

/** The actor may not perform the action. Rendered exactly like NotFound (D6). */
export class Forbidden extends AppError {
	readonly code = 'forbidden';
	constructor(key = 'errors.forbidden', params?: ErrorParams) {
		super(key, params);
	}
}

export class NotFound extends AppError {
	readonly code = 'not_found';
	constructor(key = 'errors.not_found', params?: ErrorParams) {
		super(key, params);
	}
}

export class Invalid extends AppError {
	readonly code = 'invalid';
	constructor(
		readonly issues: Issue[],
		key = 'errors.invalid',
		params?: ErrorParams
	) {
		super(key, params);
	}
}

export class Conflict extends AppError {
	readonly code = 'conflict';
	constructor(key = 'errors.conflict', params?: ErrorParams) {
		super(key, params);
	}
}

export class Throttled extends AppError {
	readonly code = 'throttled';
	constructor(key = 'errors.throttled', params?: ErrorParams) {
		super(key, params);
	}
}
