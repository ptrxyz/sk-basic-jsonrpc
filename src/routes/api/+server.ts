import type * as Kit from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { APIRouter } from './APIRouter';

export const POST: RequestHandler = async (e: Kit.RequestEvent) => {
	return APIRouter.handle(e);
};
