/**
 * CodePush Root Router Module
 *
 * This module serves as the main entry point for all CodePush-related routes,
 * combining both acquisition and management functionalities under a single router.
 *
 * Features:
 * - Unified routing for CodePush operations
 * - Path-based route organization
 * - Separate acquisition and management paths
 * - Centralized route management
 *
 * Architecture:
 * - Acquisition routes (/codepush/acquisition/*)
 *   - Update checking
 *   - Package downloads
 *   - Deployment status
 * - Management routes (/codepush/management/*)
 *   - App management
 *   - Deployment control
 *   - Release management
 *   - Collaborator management
 *
 * Security:
 * - Path-based access control
 * - Route-specific authentication
 * - Endpoint isolation
 *
 * @module routes/codepush
 */

import { createRouter } from "@/api/lib/create/router";

import { ACQUISITION_PATH, CODEPUSH_PATH, MANAGEMENT_PATH } from "@/api/lib/constants";

import { AcquisitionCodePushRouter } from "./acquisition/acquisition.routes";
import { ManagementCodePushRouter } from "./management/management.routes";

/**
 * Combined CodePush Router
 * Mounts acquisition and management routes under their respective paths
 *
 * Features:
 * - Route organization
 * - Path separation
 * - Modular routing
 *
 * Paths:
 * - /codepush/acquisition/* - Client-facing update endpoints
 * - /codepush/management/* - Admin/developer management endpoints
 *
 * @remarks
 * This router acts as the main entry point for all CodePush operations,
 * properly organizing routes based on their functionality and access requirements.
 */
const CodePushRouter = createRouter()
	.route(`${CODEPUSH_PATH}${ACQUISITION_PATH}`, AcquisitionCodePushRouter)
	.route(`${CODEPUSH_PATH}${MANAGEMENT_PATH}`, ManagementCodePushRouter);

export { CodePushRouter };
