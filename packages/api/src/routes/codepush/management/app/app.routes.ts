/**
 * CodePush App Management Routes Module
 *
 * This module implements the management API endpoints for CodePush applications.
 * It provides functionality for creating, reading, updating, and deleting apps,
 * as well as managing app-level configurations and permissions.
 *
 * Features:
 * - App CRUD operations
 * - Permission management
 * - App overview with platforms and deployments
 * - Collaborator access control
 *
 * Security:
 * - User authentication required
 * - Permission-based access control
 * - Owner/Admin role restrictions
 *
 * @module CodePushAppManagement
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { Permission } from "@rentlydev/rnota-db";

import { DEFAULT_AUTH_RESPONSES } from "@/api/lib/openapi/open-api-responses";
import { createMessageSchema, textContent } from "@/api/lib/openapi/schemas";
import {
	AddAppBodySchema,
	AppNameBodySchema,
	AppWithPlatformsAndDeploymentsResponseSchema,
	GetAppResponseSchema,
	GetAppsResponseSchema,
} from "@/api/schemas/common";
import { STRINGS } from "@/api/utils/strings";
import { AppNameQuerySchema } from "../../../../schemas/common";

/**
 * Standard response object for app not found errors
 * Used when requested app doesn't exist or user doesn't have access
 */
export const APP_NOT_FOUND_RESPONSE = {
	...DEFAULT_AUTH_RESPONSES,
	[HttpStatusCodes.NOT_FOUND]: textContent(
		createMessageSchema(STRINGS.APP.NOT_FOUND.SINGLE),
		"Requested app not found or not accessible",
	),
};

/**
 * Standard response object for permission errors
 * Used when user doesn't have required permissions for an operation
 */
export const PERMISSION_ERROR_RESPONSE = {
	[HttpStatusCodes.FORBIDDEN]: textContent(
		createMessageSchema(STRINGS.PERMISSION.FORBIDDEN(Permission.OWNER)),
		"Insufficient permissions for requested operation",
	),
};

/**
 * Standard response object for app name conflicts
 * Used when attempting to create an app with an existing name
 */
const APP_NAME_CONFLICT_RESPONSE = {
	[HttpStatusCodes.CONFLICT]: textContent(
		createMessageSchema(STRINGS.APP.CONFLICT_NAME("Test")),
		"App name already exists",
	),
};

const tags = ["Management/CodePush/App"];

/**
 * Route to get all apps accessible to the authenticated collaborator
 * Returns a list of apps where the user has collaborator access
 *
 * Endpoint: GET /apps
 * Authentication: Required
 *
 * Response:
 * - 200: List of accessible apps with collaborator details
 * - 401: Unauthorized - authentication required
 */
const GetAllCollaboratorAppsRoute = createRoute({
	tags,
	path: "/apps",
	method: "get",
	description: "Get all apps accessible to the authenticated collaborator",
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.OK]: jsonContent(GetAppsResponseSchema, "List of apps accessible to the authenticated user"),
	},
});

/**
 * Route to create a new CodePush app
 * Creates an app with the authenticated user as owner
 *
 * Endpoint: POST /app
 * Authentication: Required
 *
 * Response:
 * - 201: App created successfully
 * - 401: Unauthorized
 * - 409: App name conflict
 */
const PostAddCollaboratorAppRoute = createRoute({
	tags,
	path: "/app",
	method: "post",
	description: "Create a new CodePush app with the authenticated user as owner",
	request: {
		body: jsonContentRequired(AddAppBodySchema, "App creation details including name and icon"),
	},
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		...APP_NAME_CONFLICT_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AddAppBodySchema),
			"Request validation failed - invalid parameters provided",
		),
		[HttpStatusCodes.CREATED]: jsonContent(
			AppWithPlatformsAndDeploymentsResponseSchema,
			"Newly created app with platform and deployment configuration",
		),
	},
});

/**
 * Route to delete an existing CodePush app
 * Requires admin permissions on the app
 *
 * Endpoint: DELETE /app
 * Authentication: Required
 * Authorization: Admin role required
 *
 * Response:
 * - 200: App deleted successfully
 * - 401: Unauthorized
 * - 403: Insufficient permissions
 * - 404: App not found
 */
const DeleteCollaboratorAppRoute = createRoute({
	tags,
	path: "/app",
	method: "delete",
	description: "Delete an existing CodePush app with admin permissions",
	request: {
		body: jsonContentRequired(AppNameBodySchema, "Name of the app to delete"),
	},
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNameBodySchema),
			"Request validation failed - invalid parameters provided",
		),
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.APP_NAME_REMOVED("Test")),
			"App successfully deleted",
		),
	},
});

/**
 * Route to get details of a specific app by name
 * Returns basic app information and user's role
 *
 * Endpoint: GET /app
 * Authentication: Required
 *
 * Response:
 * - 200: App details retrieved
 * - 401: Unauthorized
 * - 404: App not found
 */
const GetCollaboratorAppByNameRoute = createRoute({
	tags,
	path: "/app",
	method: "get",
	request: { query: AppNameQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.OK]: jsonContent(GetAppResponseSchema, "App details including user's role"),
	},
});

/**
 * Route to get detailed overview of an app
 * Returns app details with platforms and deployments
 *
 * Endpoint: GET /app/overview
 * Authentication: Required
 *
 * Response:
 * - 200: Detailed app overview
 * - 401: Unauthorized
 * - 404: App not found
 */
const GetCollaboratorAppByNameWithPlatformsAndDeploymentsRoute = createRoute({
	tags,
	path: "/app/overview",
	method: "get",
	description: "Get detailed overview of an app with platforms and deployments",
	request: { query: AppNameQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNameQuerySchema),
			"Request validation failed - invalid parameters provided",
		),
		[HttpStatusCodes.OK]: jsonContent(
			AppWithPlatformsAndDeploymentsResponseSchema,
			"Detailed app overview with platforms and deployments",
		),
	},
});

/**
 * App Management Router
 * Combines all app-related routes and implements their handlers
 *
 * Features:
 * - List accessible apps
 * - Create new apps
 * - Delete existing apps
 * - Get app details
 * - Get detailed app overview
 */
const AppRouter = createRouter()
	// Get all accessible apps
	.openapi(GetAllCollaboratorAppsRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const apps = await storage.codepush.getAppsForUserId(userId);

		return c.json({ apps: apps }, HttpStatusCodes.OK);
	})
	// Create new app
	.openapi(PostAddCollaboratorAppRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, appIcon } = c.req.valid("json");
		const trimmedAppName = appName.trim();

		const app = await storage.codepush.addApp(trimmedAppName, appIcon, userId);

		return c.json({ app: app }, HttpStatusCodes.CREATED);
	})
	// Delete existing app
	.openapi(DeleteCollaboratorAppRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName } = c.req.valid("json");

		const storageApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		// Verify admin permissions
		storage.codepush.throwIfInvalidPermissions(storageApp, Permission.ADMIN);

		await storage.codepush.deleteAppByName(storageApp.app.name);

		return c.json({ message: STRINGS.APP_NAME_REMOVED(storageApp.app.name) }, HttpStatusCodes.OK);
	})
	// Get app details
	.openapi(GetCollaboratorAppByNameRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName } = c.req.valid("query");

		const app = await storage.codepush.getAppByNameForUserId(userId, appName);

		return c.json({ app: app }, HttpStatusCodes.OK);
	})
	// Get detailed app overview
	.openapi(GetCollaboratorAppByNameWithPlatformsAndDeploymentsRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName } = c.req.valid("query");

		const storageApp = await storage.codepush.getAppByNameForUserId(userId, appName);
		const appOverView = await storage.codepush.getAppOverView(storageApp.appId);

		return c.json({ app: appOverView }, HttpStatusCodes.OK);
	});

export { AppRouter };
