export type Actor = { kind: 'system'; reason: string };
export const systemActor = (reason: string): Actor => ({ kind: 'system', reason });
