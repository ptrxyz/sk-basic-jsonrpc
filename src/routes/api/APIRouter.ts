import type * as Kit from '@sveltejs/kit';
import * as kit from '@sveltejs/kit';
import { deserialize, serialize } from 'superjson';

import { config } from './config';

function isValidService(service: string): service is keyof typeof config {
	return service in config;
}

function isValidMethod(instance: unknown, method: string): method is keyof typeof instance {
	return typeof instance === 'object' && instance != null && method in instance;
}

function isCallable(fkt: unknown): fkt is (...args: unknown[]) => unknown {
	return typeof fkt === 'function';
}

export class APIRouter {
	constructor() {}

	static async handle(e: Kit.RequestEvent) {
		const body = await e.request.json();
		const id = body.id || crypto.randomUUID();

		// TODO: validate body using zod?
		if (body.jsonrpc !== '2.0')
			return new Response(`Invalid JSON-RPC version: ${body.jsonrpc} (id: ${id})`, { status: 400 });

		const [service, method]: [keyof typeof config, string] = body.method.split('.');
		const args = deserialize({ json: body.params, meta: body.meta }) as unknown[];

		if (!isValidService(service))
			return new Response(`Service not found: ${service} (id: ${id})`, { status: 404 });
		const instance = new config[service](e);
		if (!isValidMethod(instance, method))
			return new Response(`Method not found: ${service}.${method} (id: ${id})`, { status: 404 });
		const fkt = instance[method] as unknown;
		if (!isCallable(fkt))
			return new Response(`Method not callable: ${service}.${method} (id: ${id})`, { status: 405 });
		try {
			const result = serialize(await fkt(...args));

			return kit.json({
				id,
				jsonrpc: '2.0',
				result: result.json,
				meta: result.meta
			});
		} catch (e) {
			return kit.json({
				id,
				jsonrpc: '2.0',
				error: {
					code: 500, // TODO should this be -32601?
					message:
						e && typeof e === 'object' && 'message' in e ? e.message : 'Internal Server Error',
					data: e
				}
			});
		}
	}
}
