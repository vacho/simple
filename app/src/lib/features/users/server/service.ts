// Accounts (D4). Every function authorizes its action (D6) before touching data.
import * as v from 'valibot';
import type { Ctx } from '../../../server/core/ctx.ts';
import { Conflict, Invalid, NotFound } from '../../../server/core/errors.ts';
import { withTransaction } from '../../../server/core/transaction.ts';
import { parseInput } from '../../../server/core/validation.ts';
import { authorize } from '../../../server/policy/policy.ts';
import { listInstalled } from '../../languages/server/index.ts';
import { displayName, normalizeUsername, profileChanges, username } from '../validation.ts';
import * as repo from './repo.ts';

export type Profile = NonNullable<ReturnType<typeof repo.findProfile>>;
export type Credentials = NonNullable<ReturnType<typeof repo.findCredentials>>;

const adminAccount = v.object({ displayName, username });

/**
 * Setup: the first account, with the administrator role and the browser's language left unset.
 * The password arrives already hashed: hashing is async and happens before the transaction.
 */
export function createAdmin(
	ctx: Ctx,
	input: { displayName: string; username: string; passwordHash: string; timeZone: string | null }
): number {
	authorize(ctx.actor, 'users.create');
	const account = parseInput(adminAccount, input);
	return withTransaction(ctx, (tx) => {
		if (repo.usernameExists(tx.db, account.username)) throw new Conflict('users.username.taken');
		return repo.insertUser(tx.db, {
			...account,
			passwordHash: input.passwordHash,
			role: 'admin',
			locale: null,
			timeZone: input.timeZone,
			createdAt: new Date()
		});
	});
}

/** A user's profile; a missing user is reported like a forbidden one (D6). */
export function getProfile(ctx: Ctx, userId: number): Profile {
	authorize(ctx.actor, 'profile.view', { userId });
	const profile = repo.findProfile(ctx.db, userId);
	if (!profile) throw new NotFound();
	return profile;
}

/** Saves the language (a code, or null for "browser default") and the time zone. */
export function updateProfile(ctx: Ctx, userId: number, input: unknown): void {
	authorize(ctx.actor, 'profile.update', { userId });
	const changes = parseInput(profileChanges, input);
	if (changes.locale && !listInstalled(ctx).includes(changes.locale)) {
		throw new Invalid([{ field: 'locale', key: 'users.locale.not_installed', params: {} }]);
	}
	withTransaction(ctx, (tx) => {
		if (!repo.updateProfile(tx.db, userId, changes)) throw new NotFound();
	});
}

/** Sign-in only: the stored hash never leaves the auth feature. */
export function getCredentialsForSignIn(ctx: Ctx, name: string): Credentials | undefined {
	authorize(ctx.actor, 'users.readCredentials');
	return repo.findCredentials(ctx.db, normalizeUsername(name));
}

export function hasAnyUser(ctx: Ctx): boolean {
	authorize(ctx.actor, 'users.hasAny');
	return repo.anyUser(ctx.db);
}
