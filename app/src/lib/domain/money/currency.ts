// Currencies (D7). The registry is provisional: the add-currencies-and-accounts change replaces
// it with an admin-managed catalog, so money functions never read it; callers pass the currency.

export interface Currency {
	code: string;
	/** Digits after the decimal point: amounts are stored as integers of 10^-exponent units. */
	exponent: number;
}

export interface RegisteredCurrency extends Currency {
	symbol: string;
}

export const currencies = {
	BOB: { code: 'BOB', exponent: 2, symbol: 'Bs' },
	USD: { code: 'USD', exponent: 2, symbol: '$' },
	EUR: { code: 'EUR', exponent: 2, symbol: '€' },
	USDT: { code: 'USDT', exponent: 2, symbol: 'USDT' }
} as const satisfies Record<string, RegisteredCurrency>;
