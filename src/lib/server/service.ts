import { db } from '$lib/server/sql';
import type * as Kit from '@sveltejs/kit';

export class Service {
	constructor(private e: Kit.RequestEvent) {}

	async handle(arg: string) {
		const result = await db.prepare('SELECT ? as message').get(`ARG: ${arg}`);
		console.log(result);
		if (new Date().getTime() % 2 == 0) {
			throw new Error('This is an error');
		}
		return { message: new Date() };
	}
}
