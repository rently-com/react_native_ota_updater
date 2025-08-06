export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const app = await import("@rentlydev/rnota-api/app");
		const { showRoutes } = await import("hono/dev");

		showRoutes(app.default);
	}
}
