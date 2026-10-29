import { parse } from '@formatjs/icu-messageformat-parser';

export const compile = (text: string) => parse(text);
