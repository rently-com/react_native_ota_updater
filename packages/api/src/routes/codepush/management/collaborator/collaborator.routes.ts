/**
 * CodePush Collaborator Management Routes Module
 *
 * This module implements functionality for managing collaborators in CodePush applications.
 * It provides endpoints for adding, removing, and listing collaborators with different permission levels.
 *
 * Features:
 * - List app collaborators
 * - Add new collaborators with specified permissions
 * - Remove existing collaborators
 * - Permission-based access control
 *
 * Security:
 * - Owner/Admin permission validation
 * - User-scoped operations
 * - Email-based collaborator identification
 *
 * @module routes/codepush/management/collaborator
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { Permission, selectCodePushCollaboratorWithUserSchema } from "@rentlydev/rnota-db";

import { AppNameEmailBodySchema, AppNameEmailPermissionBodySchema, AppNameQuerySchema } from "@/api/schemas/common";
import { STRINGS } from "@/api/utils/strings";

import { APP_NOT_FOUND_RESPONSE, PERMISSION_ERROR_RESPONSE } from "../app/app.routes";

const tags = ["Management/CodePush/Collaborator"];

/**
 * Route Configuration for Listing App Collaborators
 * Retrieves all collaborators for a specified application
 *
 * Features:
 * - Collaborator list retrieval
 * - Permission level information
 * - User details inclusion
 *
 * Endpoint: GET /collaborators
 * Authentication: Required
 *
 * @throws {404} When app is not found
 * @returns {Object} List of collaborators with their details
 */
const GetCollaboratorsForApp = createRoute({
	tags,
	path: "/collaborators",
	method: "get",
	description: "Retrieves all collaborators for the specified application",
	request: { query: AppNameQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNameQuerySchema),
			"Returns an error if the app name query parameter is missing or invalid",
		),
		[HttpStatusCodes.OK]: jsonContent(
			z.object({
				collaborators: z
					.array(selectCodePushCollaboratorWithUserSchema)
					.openapi({ description: "The list of collaborators for the app" }),
			}),
			"Returns the list of collaborators for the app",
		),
	},
});

/**
 * Route Configuration for Adding App Collaborator
 * Adds a new collaborator to an application with specified permissions
 *
 * Features:
 * - Permission level assignment
 * - Owner/Admin validation
 * - Email-based user lookup
 *
 * Endpoint: POST /collaborator
 * Authentication: Required (Owner/Admin only)
 *
 * @throws {404} When app is not found
 * @throws {403} When user lacks required permissions
 * @returns {Object} Success message with collaborator details
 */
const PostAddCollaboratorForApp = createRoute({
	tags,
	path: "/collaborator",
	method: "post",
	description: "Adds a new collaborator to the specified application",
	request: { body: jsonContentRequired(AppNameEmailPermissionBodySchema, "The payload for adding new collaborator") },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNameEmailPermissionBodySchema),
			"Returns an error if the payload is missing or invalid",
		),
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.COLLABORATOR_ADDED("test@example.com", "TestApp")),
			"Returns success message",
		),
	},
});

/**
 * Route Configuration for Removing App Collaborator
 * Removes an existing collaborator from an application
 *
 * Features:
 * - Permission validation
 * - Cascading removal
 * - Admin protection
 *
 * Endpoint: DELETE /collaborator
 * Authentication: Required (Owner only)
 *
 * @throws {404} When app is not found
 * @throws {403} When user lacks required permissions
 * @returns {Object} Success message confirming removal
 */
const DeleteCollaboratorForApp = createRoute({
	tags,
	path: "/collaborator",
	method: "delete",
	description: "Removes a collaborator from the specified application",
	request: { body: jsonContentRequired(AppNameEmailBodySchema, "The payload for removing collaborator for an app") },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.COLLABORATOR_REMOVED("test@example.com", "TestApp")),
			"Returns success message",
		),
	},
});

/**
 * Collaborator Management Router Implementation
 * Combines all collaborator management routes with their handlers
 *
 * Features:
 * - Permission validation
 * - User lookup and verification
 * - Atomic operations
 *
 * Security:
 * - Permission-based access control
 * - User scope validation
 * - Email verification
 *
 * @throws {401} When authentication fails
 * @throws {403} When permission check fails
 * @throws {404} When app or user not found
 */
const CollaboratorRouter = createRouter()
	.openapi(GetCollaboratorsForApp, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName } = c.req.valid("query");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const collaborators = await storage.codepush.getCollaboratorsByAppId(collaboratorApp.appId);

		return c.json({ collaborators: collaborators }, HttpStatusCodes.OK);
	})
	.openapi(PostAddCollaboratorForApp, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, email, permission } = c.req.valid("json");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.OWNER);

		if (permission === Permission.ADMIN) {
			storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.ADMIN);
		}

		const newCollaboratorUser = await storage.getUserByEmail(email);

		await storage.codepush.addCollaboratorByUserId(newCollaboratorUser.id, collaboratorApp.appId, permission);

		return c.json({ message: STRINGS.COLLABORATOR_ADDED(email, appName) }, HttpStatusCodes.OK);
	})
	.openapi(DeleteCollaboratorForApp, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, email } = c.req.valid("json");

		const requestingCollaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		storage.codepush.throwIfInvalidPermissions(requestingCollaboratorApp, Permission.OWNER);

		const collaboratorToRemoveAccount = await storage.getUserByEmail(email);
		const collaboratorToRemoveApp = await storage.codepush.getAppByNameForUserId(
			collaboratorToRemoveAccount.id,
			appName,
		);

		if (collaboratorToRemoveApp.permission === Permission.ADMIN) {
			storage.codepush.throwIfInvalidPermissions(requestingCollaboratorApp, Permission.ADMIN);
		}

		await storage.codepush.removeCollaboratorByUserId(collaboratorToRemoveApp.userId, collaboratorToRemoveApp.appId);

		return c.json({ message: STRINGS.COLLABORATOR_REMOVED(email, appName) }, HttpStatusCodes.OK);
	});

export { CollaboratorRouter };
