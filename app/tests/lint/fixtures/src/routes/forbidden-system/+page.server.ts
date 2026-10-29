import { systemActor } from '../../lib/server/core/actor.ts';

export const load = () => ({ actor: systemActor('route') });
