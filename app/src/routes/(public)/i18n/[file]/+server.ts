import { error } from '@sveltejs/kit';
import { getDictionaryFile } from '#lib/features/languages/server/index.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import type { RequestHandler } from './$types';

// The URL changes with the content, so the file can be cached forever (D14).
export const GET: RequestHandler = (event) => {
	const dictionary = getDictionaryFile(buildCtx(event), event.params.file);
	if (!dictionary) error(404, 'Not found');
	return new Response(dictionary.body, {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
