import { getOverview } from '#lib/features/settings/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import { throwForLoad } from '#lib/server/web/responses.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	try {
		return { overview: getOverview(buildCtx(event)) };
	} catch (error) {
		throwForLoad(error);
	}
};
