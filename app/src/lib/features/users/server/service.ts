// Accounts (D4). Every function authorizes its action (D6) before touching data.
import * as v from 'valibot';
import type { Ctx } from '../../../server/core/ctx.ts';
import { Conflict, Forbidden, Invalid, NotFound } from '../../../server/core/errors.ts';
import { withTransaction } from '../../../server/core/transaction.ts';
import { parseInput } from '../../../server/core/validation.ts';
import { authorize } from '../../../server/policy/policy.ts';
import { listInstalled } from '../../languages/server/index.ts';
import { displayName, normalizeUsername, profileChanges, role, username } from '../validation.ts';
import * as repo from './repo.ts';

export type Profile = NonNullable<ReturnType<typeof repo.findProfile>>;
export type Credentials = NonNullable<ReturnType<typeof repo.findCredentials>>;
export type Account = ReturnType<typeof repo.listAccounts>[number];

const adminAccount = v.object({ displayName, username });
const memberAccount = v.object({ displayName, username, role });

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

/** Password changes only: the stored hash never leaves the auth feature. */
export function getCredentialsById(ctx: Ctx, userId: number): Credentials | undefined {
	authorize(ctx.actor, 'users.readCredentials');
	return repo.findCredentialsById(ctx.db, userId);
}

export function hasAnyUser(ctx: Ctx): boolean {
	authorize(ctx.actor, 'users.hasAny');
	return repo.anyUser(ctx.db);
}

/**
 * An account created by an administrator, with a temporary password (ADR 0027). The password
 * arrives hashed: hashing is async and happens before the transaction.
 */
export function createAccount(
	ctx: Ctx,
	input: { displayName: string; username: string; role: string; passwordHash: string }
): number {
	authorize(ctx.actor, 'accounts.create');
	const account = parseInput(memberAccount, input);
	return withTransaction(ctx, (tx) => {
		if (repo.usernameExists(tx.db, account.username)) throw new Conflict('users.username.taken');
		return repo.insertUser(tx.db, {
			...account,
			passwordHash: input.passwordHash,
			passwordTemporary: true,
			locale: null,
			timeZone: null,
			createdAt: new Date()
		});
	});
}

export function listAccounts(ctx: Ctx): Account[] {
	authorize(ctx.actor, 'accounts.view');
	return repo.listAccounts(ctx.db);
}

/** Refuses a change that would leave no active administrator (ADR 0027). */
function keepAnAdministrator(
	ctx: Ctx,
	userId: number,
	current: { role: string },
	after: { role: string; active: boolean }
): void {
	const staysAdmin = after.role === 'admin' && after.active;
	if (current.role === 'admin' && !staysAdmin && repo.otherActiveAdmins(ctx.db, userId) === 0) {
		throw new Conflict('users.last_admin');
	}
}

/** Another user's role; it applies from their next request. */
export function setRole(ctx: Ctx, userId: number, input: unknown): void {
	authorize(ctx.actor, 'accounts.manage', { userId });
	const newRole = parseInput(role, input);
	withTransaction(ctx, (tx) => {
		const current = repo.findAccountState(tx.db, userId);
		if (!current) throw new NotFound();
		keepAnAdministrator(tx, userId, current, { role: newRole, active: current.active });
		repo.updateAccount(tx.db, userId, { role: newRole });
	});
}

/** Deactivates or reactivates another user's account; auth ends the sessions. */
export function setActive(ctx: Ctx, userId: number, active: boolean): void {
	authorize(ctx.actor, 'accounts.manage', { userId });
	withTransaction(ctx, (tx) => {
		const current = repo.findAccountState(tx.db, userId);
		if (!current) throw new NotFound();
		keepAnAdministrator(tx, userId, current, { role: current.role, active });
		repo.updateAccount(tx.db, userId, { active });
	});
}

/** An administrator's reset: a new temporary password for another user. */
export function setTemporaryPassword(ctx: Ctx, userId: number, passwordHash: string): void {
	authorize(ctx.actor, 'accounts.manage', { userId });
	withTransaction(ctx, (tx) => {
		if (!repo.findAccountState(tx.db, userId)) throw new NotFound();
		repo.updateAccount(tx.db, userId, { passwordHash, passwordTemporary: true });
	});
}

/** The user's own new password, which is never temporary. */
export function setOwnPassword(ctx: Ctx, passwordHash: string): void {
	authorize(ctx.actor, 'password.changeOwn');
	const { actor } = ctx;
	if (actor.kind !== 'user') throw new Forbidden();
	withTransaction(ctx, (tx) => {
		repo.updateAccount(tx.db, actor.id, { passwordHash, passwordTemporary: false });
	});
}
