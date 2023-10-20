import type * as Kit from '@sveltejs/kit';
import { serialize, deserialize } from 'superjson';

import type { config } from './config';

function buildPayload(
	{ service, method, args }: { service: string; method: string; args: unknown[] }
) {
	const serializedArgs = serialize(args);

	return {
		jsonrpc: '2.0',
		id: crypto.randomUUID(),
		method: `${service}.${method}`,
		params: serializedArgs.json,
		meta: serializedArgs.meta || null
	};
}

type Payload = ReturnType<typeof buildPayload>;

type AnyServiceClass = new (e: Kit.RequestEvent) => unknown;
type PromisifyMethods<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R
		? R extends Promise<unknown>
			? T[K]
			: (...args: A) => Promise<R>
		: never;
};

class Client<T extends Record<string, AnyServiceClass>> {
	constructor(private base: string) {}

	async post(payload: Payload) {
		const r = await fetch(`${this.base}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const result = await r.json();

		// result type:
		// {
		// 	id: '12341234'      the ID used for the request
		// 	jsonrpc: '2.0'      constant
		// 	result: unknown     JSON of whatever the RPC function returns
		// 	error: {            JSON of whatever the RPC function throws
		//    code: 500         constant   // TODO should this be -32601
		//    message: string   error message if thrown
		//    data: unknown     raw exception
		//  }
		// 	meta?: {}         Superjson metadata to transform types correctly
		// }

		if ('meta' in result) {
			result.result = deserialize({ json: result.result, meta: result.meta });
		}

		if ('error' in result) {
			throw new Error(`RPC Error: ${result.error.message} (id: ${result.id})`);
		}

		// TODO: add logging here: id, method, params, result, error....

		return result.result;
	}

	client() {
		return new Proxy(
			{},
			{
				get: (_, prop) => {
					const p1 = String(prop);
					return new Proxy(
						{},
						{
							get: (_, prop2) => {
								const p2 = String(prop2);
								return async (...args: unknown[]) => {
									const payload = buildPayload({ service: p1, method: p2, args });
									return this.post(payload);
								};
							}
						}
					);
				}
			}
		) as {
			[K in keyof T]: PromisifyMethods<InstanceType<T[K]>>;
		};
	}
}

export const client = new Client<typeof config>('http://localhost:5173/api').client();
