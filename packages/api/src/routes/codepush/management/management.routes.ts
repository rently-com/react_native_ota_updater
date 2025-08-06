/**
 * CodePush Management Routes Module
 *
 * This module combines all CodePush management-related routers into a single router.
 * It provides centralized routing for app, collaborator, deployment, history and release management.
 *
 * Features:
 * - App management (creation, deletion, updates)
 * - Collaborator management (add/remove/list collaborators)
 * - Deployment management (create/delete/list deployments)
 * - Release history management
 * - Release management (promote/rollback/patch)
 * - Statistics and analytics
 *
 * Security:
 * - Permission-based access control
 * - User scope validation
 * - API key validation
 *
 * @module routes/codepush/management
 */

import { createRouter } from "@/api/lib/create/router";

import { AppRouter } from "./app/app.routes";
import { CollaboratorRouter } from "./collaborator/collaborator.routes";
import { DeploymentRouter } from "./deployment/deployment.routes";
import { HistoryRouter } from "./history/history.routes";
import { ReleaseRouter } from "./release/release.routes";
import { StatsRouter } from "./stats/stats.routes";

/**
 * Combined Management Router for CodePush
 * Aggregates all management-related routers into a single router instance
 *
 * Features:
 * - Modular router composition
 * - Consistent route prefixing
 * - Centralized management endpoints
 *
 * @returns {Router} Combined router with all management routes
 */
const ManagementCodePushRouter = createRouter()
	.route("/", AppRouter)
	.route("/", CollaboratorRouter)
	.route("/", DeploymentRouter)
	.route("/", HistoryRouter)
	.route("/", ReleaseRouter)
	.route("/", StatsRouter);

export { ManagementCodePushRouter };
