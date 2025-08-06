import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import authEnv from "@rentlydev/rnota-auth/env";
import awsEnv from "@rentlydev/rnota-aws/env";
import dbEnv from "@rentlydev/rnota-db/env";
import redisEnv from "@rentlydev/rnota-redis/env";

const env = createEnv({
	extends: [awsEnv, dbEnv, redisEnv, authEnv],
	shared: {
		NODE_ENV: z.enum(["development", "production"]).default("development"),
	},
	server: {
		PORT: z.coerce.number().default(3000),
		LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
	},
	client: {
		NEXT_PUBLIC_API_URL: z.string(),
	},
	experimental__runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
	},
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});

export default env;
