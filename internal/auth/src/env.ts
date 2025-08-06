import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production"]).optional(),
		AUTH_URL: z.string().url(),
		AUTH_SECRET: z.string(),
		AUTH_GITHUB_ID: z.string(),
		AUTH_GITHUB_SECRET: z.string(),
		AUTH_ALLOWED_DOMAIN: z.string().optional(),
	},
	client: {},
	experimental__runtimeEnv: {},
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});

export default env;
