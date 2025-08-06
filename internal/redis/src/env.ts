import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const env = createEnv({
	server: {
		REDIS_URL: z.string().url(),
	},
	client: {},
	experimental__runtimeEnv: {},
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});

export default env;
