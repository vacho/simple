import { defineConfig } from 'drizzle-kit';

// Each feature owns its tables (ADR 0008); migrations are generated into drizzle/ and committed.
export default defineConfig({
	dialect: 'sqlite',
	schema: 'src/lib/features/*/server/schema.ts',
	out: 'drizzle'
});
