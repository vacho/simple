import { db } from '../../../server/db/client.ts';
import { users } from './schema.ts';

type Writer = { insert: (table: unknown) => void };

export const addUser = () => (db as Writer).insert(users);
