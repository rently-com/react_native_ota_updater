/**
 * @file Common routes module that combines user and access key management routes
 * @module routes/common
 */

import { MANAGEMENT_PATH } from "@/api/lib/constants";
import { createRouter } from "@/api/lib/create/router";

import { AccessKeyRouter } from "./access-key.routes";
import { UserRouter } from "./user.routes";

/**
 * Combined router for common management functionality.
 * Mounts both user management and access key management routes under the management path.
 *
 * @remarks
 * This router combines two main management functionalities:
 * 1. User management (authentication, profile, etc.)
 * 2. Access key management (creation, validation, etc.)
 *
 * @exports CommonRouter
 */
const CommonRouter = createRouter()
	.route(`${MANAGEMENT_PATH}`, UserRouter)
	.route(`${MANAGEMENT_PATH}`, AccessKeyRouter);

export { CommonRouter };
