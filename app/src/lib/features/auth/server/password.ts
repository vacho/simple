// Argon2id password hashing (D4) with the OWASP parameters: 19 MiB, 2 iterations, 1 lane.
import { hash, verify } from '@node-rs/argon2';

const options = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
	return hash(password, options);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
	return verify(passwordHash, password);
}

/**
 * A hash of no real password, made once when the server starts, with the same parameters, so an
 * unknown username costs the same verification as a wrong password (no account enumeration).
 */
export const dummyHash: Promise<string> = hashPassword('unused dummy password for unknown users');
