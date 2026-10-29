// Use cases own their transactions (D16). Transactions are synchronous: better-sqlite3 can't
// await inside one, so a callback returning a promise doesn't compile (and throws at runtime).
import type { Ctx } from './ctx.ts';

type NotPromise<T> = T extends PromiseLike<unknown> ? never : T;

/**
 * Runs fn in a transaction: commits when it returns, rolls back when it throws. Inside an open
 * transaction it just runs fn, so the outermost use case owns the transaction and every service
 * it calls joins it. Failures whose writes must persist are returned, not thrown.
 */
export function withTransaction<T>(ctx: Ctx, fn: (ctx: Ctx) => NotPromise<T>): T {
	if (ctx.inTransaction) return fn(ctx);
	// The transaction lives on the connection, so ctx.db keeps working inside it.
	return ctx.db.$client.transaction(() => fn({ ...ctx, inTransaction: true }))();
}
