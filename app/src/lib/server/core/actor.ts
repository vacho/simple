// Who is acting (D6). Requests produce anonymous or user actors; only trusted internal code
// (auth internals, startup.ts, scripts/) may build a system actor, which lint enforces.

export type Role = 'admin' | 'member';

export interface AnonymousActor {
	kind: 'anonymous';
}

export interface UserActor {
	kind: 'user';
	id: number;
	role: Role;
	/** Saved language; null means the browser decides (D14). */
	locale: string | null;
	/** Canonical IANA zone; null means UTC. */
	timeZone: string | null;
}

export interface SystemActor {
	kind: 'system';
	/** Why the application acts on its own, for logs and tests. */
	reason: string;
}

export type Actor = AnonymousActor | UserActor | SystemActor;

export const anonymous: AnonymousActor = Object.freeze({ kind: 'anonymous' });

export function systemActor(reason: string): SystemActor {
	return { kind: 'system', reason };
}
