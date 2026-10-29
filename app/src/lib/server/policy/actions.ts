// Every action the policy knows (D6), with the target each one is checked against. Each new
// action gets a rule in policy.ts and a row in the matrix test.

/** Actions on a user's own data, checked against the user they target. */
export interface Targets {
	'profile.view': { userId: number };
	'profile.update': { userId: number };
}

export type Action =
	// Public: anyone, signed in or not.
	| 'auth.setupStatus'
	| 'auth.setup'
	| 'auth.signIn'
	| 'languages.read'
	// Signed-in users.
	| 'auth.signOut'
	| keyof Targets
	// Administrators.
	| 'settings.view'
	// System-only: the application itself, never a request.
	| 'users.create'
	| 'users.readCredentials'
	| 'users.hasAny'
	| 'auth.validateSession'
	| 'languages.seed';

/** The target argument an action needs: one for actions in Targets, none otherwise. */
export type TargetArgs<A extends Action> = A extends keyof Targets ? [target: Targets[A]] : [];
