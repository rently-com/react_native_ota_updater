import { BASE_API_PATH } from "@/api/lib/constants";
import { createRouter } from "@/api/lib/create/router";
import type { AppOpenAPI } from "@/api/lib/types";

import { CommonRouter } from "@/api/routes/common/common.routes";
import { HealthRoute } from "@/api/routes/health/health.routes";

import { CodePushRouter } from "@/api/routes/codepush/codepush.routes";

export function registerRoutes(app: AppOpenAPI) {
	return app.route("/", HealthRoute).route("/", CommonRouter).route("/", CodePushRouter);
}

export const router = registerRoutes(createRouter().basePath(BASE_API_PATH));
export type router = typeof router;
