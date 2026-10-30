// The single authorization decision (D6): deny by default, nothing bypasses it. Later changes
// add grants and scopes here; call sites don't change.
import type { Actor } from '../core/actor.ts';
import { Forbidden } from '../core/errors.ts';
import type { Action, TargetArgs, Targets } from './actions.ts';

type Rule = (actor: Actor, target?: Targets[keyof Targets]) => boolean;

const isAdmin = (actor: Actor) => actor.kind === 'user' && actor.role === 'admin';

const anyone: Rule = () => true;
const anyRequest: Rule = (actor) => actor.kind !== 'system';
const anonymousOnly: Rule = (actor) => actor.kind === 'anonymous';
const signedIn: Rule = (actor) => actor.kind === 'user';
const adminOnly: Rule = isAdmin;
const systemOnly: Rule = (actor) => actor.kind === 'system';
const ownOrAdmin: Rule = (actor, target) =>
	isAdmin(actor) || (actor.kind === 'user' && target?.userId === actor.id);
const adminOnOthers: Rule = (actor, target) =>
	isAdmin(actor) && actor.kind === 'user' && target?.userId !== actor.id;

// While a password is temporary, only these are allowed (ADR 0027): the gate covers every
// action, including those later changes add.
const allowedWithTemporaryPassword = new Set<Action>([
	'auth.setupStatus',
	'auth.signIn',
	'languages.read',
	'auth.signOut',
	'password.changeOwn'
]);

// The matrix of D6. Setup is also refused once any user exists: a precondition the auth
// service checks in its transaction, not a policy rule.
const rules: Record<Action, Rule> = {
	'auth.setupStatus': anyone,
	'auth.setup': anonymousOnly,
	'auth.signIn': anyRequest,
	'auth.signOut': signedIn,
	'password.changeOwn': signedIn,
	'household.view': signedIn,
	'languages.read': anyone,
	'profile.view': ownOrAdmin,
	'profile.update': ownOrAdmin,
	'settings.view': adminOnly,
	'household.update': adminOnly,
	'memberTypes.manage': adminOnly,
	'members.manage': adminOnly,
	'accounts.view': adminOnly,
	'accounts.create': adminOnly,
	'accounts.manage': adminOnOthers,
	'users.create': systemOnly,
	'users.readCredentials': systemOnly,
	'users.hasAny': systemOnly,
	'auth.validateSession': systemOnly,
	'languages.seed': systemOnly
};

export function can<A extends Action>(
	actor: Actor,
	action: A,
	...[target]: TargetArgs<A>
): boolean {
	// Object.hasOwn: an action without a rule, even one smuggled past the types, is denied.
	if (!Object.hasOwn(rules, action)) return false;
	if (actor.kind === 'user' && actor.passwordTemporary && !allowedWithTemporaryPassword.has(action))
		return false;
	return rules[action](actor, target);
}

export function authorize<A extends Action>(
	actor: Actor,
	action: A,
	...target: TargetArgs<A>
): void {
	if (!can(actor, action, ...target)) throw new Forbidden();
}
