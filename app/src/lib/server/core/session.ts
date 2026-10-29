// What validating a session means for the session cookie (D5), without any HTTP types: the
// web adapter writes or deletes the cookie, another adapter would do its own thing.
export type SessionResult =
	| { action: 'keep' }
	/** The session was extended: re-send the cookie, valid until expiresAt. */
	| { action: 'renew'; expiresAt: Date }
	/** The token was expired, signed out or unknown: delete the cookie. */
	| { action: 'clear' };
