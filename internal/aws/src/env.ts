import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const env = createEnv({
	server: {
		AWS_REGION: z.string().optional(),
		AWS_ACCESS_KEY_ID: z.string().optional(),
		AWS_ACCESS_KEY_SECRET: z.string().optional(),
		AWS_CLOUDFRONT_URL: z.string().url().optional(),
		AWS_S3_BUCKET: z.string().optional(),

		CLOUDFLARE_ACCOUNT_ID: z.string(),
		CLOUDFLARE_R2_ACCESS_KEY_ID: z.string(),
		CLOUDFLARE_R2_ACCESS_KEY_SECRET: z.string(),
		CLOUDFLARE_URL: z.string().url(),
		CLOUDFLARE_R2_BUCKET: z.string(),
	},
	client: {},
	experimental__runtimeEnv: {},
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});

export default env;
