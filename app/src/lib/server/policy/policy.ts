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

// The matrix of D6. Setup is also refused once any user exists: a precondition the auth
// service checks in its transaction, not a policy rule.
const rules: Record<Action, Rule> = {
	'auth.setupStatus': anyone,
	'auth.setup': anonymousOnly,
	'auth.signIn': anyRequest,
	'auth.signOut': signedIn,
	'languages.read': anyone,
	'profile.view': ownOrAdmin,
	'profile.update': ownOrAdmin,
	'settings.view': adminOnly,
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
	return Object.hasOwn(rules, action) && rules[action](actor, target);
}

export function authorize<A extends Action>(
	actor: Actor,
	action: A,
	...target: TargetArgs<A>
): void {
	if (!can(actor, action, ...target)) throw new Forbidden();
}
