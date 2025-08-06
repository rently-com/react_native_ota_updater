import type { ClientResponse } from "hono/client";
import type { ResponseFormat } from "hono/types";
import type { StatusCode } from "hono/utils/http-status";

export const handleApiError = async (res: ClientResponse<unknown, StatusCode, ResponseFormat>): Promise<never> => {
	const errorMessage: unknown = (await res.text()) || (await res.json());
	console.log("111 🚀 ~ handleApiError ~ res:", res, errorMessage);

	if (res.status >= 500) {
		throw new Error(`Internal server error: ${res.status} ${errorMessage}`);
	}

	if (res.status === 401) {
		throw new Error(`${res.status} ${errorMessage}`);
	}

	if (res.status === 409 || res.status === 403 || res.status === 422 || res.status === 404) {
		throw new Error(`${res.status} ${errorMessage}`);
	}

	throw new Error(`Unknown error: ${res.status} ${errorMessage}`);
};
