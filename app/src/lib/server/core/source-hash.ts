import { createHash } from 'node:crypto';

/**
 * Hash of the English text a translation was made from (D14). A translation whose hash differs
 * from the current English text's is stale. Shared by the message checks and the languages seed.
 */
export function sourceHash(englishText: string): string {
	return createHash('sha256').update(englishText).digest('hex').slice(0, 16);
}
