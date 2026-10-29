import { authorize } from '../../../server/policy/policy.ts';
import type { Actor } from '../../../server/core/actor.ts';

export const listNotes = (actor: Actor) => {
	authorize();
	return [actor.kind];
};
