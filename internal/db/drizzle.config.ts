import { defineConfig } from "drizzle-kit";
import env from "./src/env";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/schema",
	dialect: "postgresql",
	verbose: true,
	strict: true,
	casing: "snake_case",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
