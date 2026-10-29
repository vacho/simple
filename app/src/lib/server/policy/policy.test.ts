// One test per cell of the D6 matrix. The expected matrix is written here, separately from the
// rules, so a change to either one without the other fails.
import { describe, expect, it } from 'vitest';
import { anonymous, systemActor, type Actor } from '../core/actor.ts';
import { Forbidden } from '../core/errors.ts';
import type { Action } from './actions.ts';
import { authorize, can } from './policy.ts';

const actors = {
	anonymous,
	user: { kind: 'user', id: 1, role: 'member', locale: null, timeZone: null },
	admin: { kind: 'user', id: 2, role: 'admin', locale: null, timeZone: null },
	system: systemActor('policy test')
} satisfies Record<string, Actor>;

type Cell = 'allow' | 'deny';
type Row = [label: string, check: (actor: Actor) => boolean, cells: [Cell, Cell, Cell, Cell]];

const own = (action: 'profile.view' | 'profile.update') => (actor: Actor) =>
	can(actor, action, { userId: actor.kind === 'user' ? actor.id : 0 });
const other = (action: 'profile.view' | 'profile.update') => (actor: Actor) =>
	can(actor, action, { userId: 99 });
const plain = (action: Action) => (actor: Actor) =>
	(can as (a: Actor, x: Action) => boolean)(actor, action);

//                                                          anonymous user     admin    system
const matrix: Row[] = [
	['auth.setupStatus', plain('auth.setupStatus'), ['allow', 'allow', 'allow', 'allow']],
	['auth.setup', plain('auth.setup'), ['allow', 'deny', 'deny', 'deny']],
	['auth.signIn', plain('auth.signIn'), ['allow', 'allow', 'allow', 'deny']],
	['auth.signOut (own session)', plain('auth.signOut'), ['deny', 'allow', 'allow', 'deny']],
	['languages.read', plain('languages.read'), ['allow', 'allow', 'allow', 'allow']],
	['profile.view (own)', own('profile.view'), ['deny', 'allow', 'allow', 'deny']],
	['profile.update (own)', own('profile.update'), ['deny', 'allow', 'allow', 'deny']],
	['profile.view (other user)', other('profile.view'), ['deny', 'deny', 'allow', 'deny']],
	['profile.update (other user)', other('profile.update'), ['deny', 'deny', 'allow', 'deny']],
	['settings.view', plain('settings.view'), ['deny', 'deny', 'allow', 'deny']],
	['users.create', plain('users.create'), ['deny', 'deny', 'deny', 'allow']],
	['users.readCredentials', plain('users.readCredentials'), ['deny', 'deny', 'deny', 'allow']],
	['users.hasAny', plain('users.hasAny'), ['deny', 'deny', 'deny', 'allow']],
	['auth.validateSession', plain('auth.validateSession'), ['deny', 'deny', 'deny', 'allow']],
	['languages.seed', plain('languages.seed'), ['deny', 'deny', 'deny', 'allow']],
	['any action not listed', plain('ledger.delete' as Action), ['deny', 'deny', 'deny', 'deny']],
	['a name inherited from Object', plain('toString' as Action), ['deny', 'deny', 'deny', 'deny']]
];

const cells = matrix.flatMap(([label, check, expected]) =>
	(Object.keys(actors) as (keyof typeof actors)[]).map(
		(name, index) => [label, name, check, expected[index]] as const
	)
);

describe('policy matrix (D6)', () => {
	it.each(cells)('%s, %s: %s', (_label, name, check, expected) => {
		expect(check(actors[name])).toBe(expected === 'allow');
	});
});

describe('authorize', () => {
	it('Operation with no rule is denied', () => {
		expect(() => authorize(actors.user, 'ledger.delete' as 'settings.view')).toThrow(Forbidden);
	});

	it('Administrator cannot read credentials', () => {
		expect(() => authorize(actors.admin, 'users.readCredentials')).toThrow(Forbidden);
	});

	it('requires a target exactly for the actions checked against one', () => {
		// @ts-expect-error a profile check needs the user it targets
		expect(can(actors.admin, 'profile.view')).toBe(true);
		// @ts-expect-error settings.view takes no target
		expect(can(actors.admin, 'settings.view', { userId: 1 })).toBe(true);
	});

	it('passes when the rule allows', () => {
		expect(() => authorize(actors.admin, 'profile.update', { userId: 99 })).not.toThrow();
	});
});
