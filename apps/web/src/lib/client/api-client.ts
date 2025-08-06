import apiClient from "@rentlydev/rnota-api-client";

export default apiClient(process.env.NEXT_PUBLIC_API_URL ?? "/", {
	async fetch(input, requestInit, Env, executionCtx) {
		let cookies = "";
		if (typeof window === "undefined") {
			cookies = (await (await import("next/headers")).headers()).get("cookie") ?? "";
		}

		return fetch(input, {
			...requestInit,
			...(typeof window === "undefined" ? { headers: { cookie: cookies } } : {}),
		});
	},
});
