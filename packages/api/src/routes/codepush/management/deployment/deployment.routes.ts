/**
 * CodePush Deployment Management Routes Module
 *
 * This module implements functionality for managing deployments in CodePush applications.
 * It provides endpoints for creating, retrieving, and deleting deployments across different platforms.
 *
 * Features:
 * - List all deployments for an app
 * - Get specific deployment details
 * - Create new deployments
 * - Remove existing deployments
 * - Platform-specific deployment management
 * - Roll deployment keys
 * - Set custom deployment keys
 *
 * Security:
 * - Owner/Admin permission validation
 * - User-scoped operations
 * - Deployment name uniqueness enforcement
 *
 * Performance:
 * - Optimized deployment queries
 * - Atomic deployment operations
 * - Efficient platform filtering
 *
 * @module routes/codepush/management/deployment
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { Permission } from "@rentlydev/rnota-db";

import { createMessageSchema, textContent } from "@/api/lib/openapi/schemas";
import {
	AppNameDeploymentBodySchema,
	AppNamePlatformDeploymentQuerySchema,
	AppNameQuerySchema,
	AppWithPlatformsAndDeploymentsResponseSchema,
	CustomDeploymentKeyBodySchema,
	DeploymentResponseSchema,
	RollDeploymentKeyBodySchema,
} from "@/api/schemas/common";
import { STRINGS } from "@/api/utils/strings";

import { APP_NOT_FOUND_RESPONSE } from "../app/app.routes";

/**
 * Standard response object for deployment name conflicts
 * Used when attempting to create a deployment with a name that already exists
 * @constant {object}
 */
const DEPLOYMENT_NAME_CONFLICT_RESPONSE = {
	[HttpStatusCodes.CONFLICT]: textContent(
		createMessageSchema(STRINGS.DEPLOYMENT.CONFLICT_NAME("TestDeployment")),
		"Deployment already exists",
	),
};

const tags = ["Management/CodePush/Deployment"];

/**
 * Route Configuration for Listing All App Deployments
 * Retrieves all deployments across all platforms for a specified application
 *
 * Features:
 * - Multi-platform deployment listing
 * - Deployment status information
 * - Platform-specific grouping
 *
 * Endpoint: GET /deployments
 * Authentication: Required
 *
 * @throws {404} When app is not found
 * @returns {Object} App with platforms and their deployments
 */
const GetAllDeploymentsForAppRoute = createRoute({
	tags,
	path: "/deployments",
	method: "get",
	description: "Retrieves all deployments for the specified application across all platforms",
	request: { query: AppNameQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNameQuerySchema),
			"Invalid query parameters",
		),
		[HttpStatusCodes.OK]: jsonContent(
			AppWithPlatformsAndDeploymentsResponseSchema,
			"Returns the list of deployments for the app",
		),
	},
});

/**
 * Route Configuration for Getting Platform-Specific Deployment
 * Retrieves deployment details for a specific platform and deployment name
 *
 * Features:
 * - Platform-specific filtering
 * - Deployment detail retrieval
 * - Status information
 *
 * Endpoint: GET /deployment
 * Authentication: Required
 *
 * @throws {404} When app or deployment is not found
 * @returns {Object} Deployment details for specified platform
 */
const GetDeploymentForAppPlatformRoute = createRoute({
	tags,
	path: "/deployment",
	method: "get",
	description: "Retrieves deployment details for a specific platform and deployment name",
	request: { query: AppNamePlatformDeploymentQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNamePlatformDeploymentQuerySchema),
			"Invalid query parameters",
		),
		[HttpStatusCodes.OK]: jsonContent(
			DeploymentResponseSchema,
			"Returns the deployment details for the specified platform",
		),
	},
});

/**
 * Route Configuration for Creating New Deployment
 * Creates a new deployment for an application
 *
 * Features:
 * - Deployment creation
 * - Name validation
 * - Permission checking
 *
 * Endpoint: POST /deployment
 * Authentication: Required (Owner only)
 *
 * @throws {404} When app is not found
 * @throws {409} When deployment name already exists
 * @returns {Object} Updated app with new deployment
 */
const PostAddDeploymentForAppRoute = createRoute({
	tags,
	path: "/deployment",
	method: "post",
	description: "Creates a new deployment for the specified application",
	request: { body: jsonContentRequired(AppNameDeploymentBodySchema, "New Deployment details") },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...DEPLOYMENT_NAME_CONFLICT_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNameDeploymentBodySchema),
			"Invalid request body",
		),
		[HttpStatusCodes.OK]: jsonContent(
			AppWithPlatformsAndDeploymentsResponseSchema,
			"Returns the updated list of deployments for the app",
		),
	},
});

/**
 * Route Configuration for Removing Deployment
 * Deletes an existing deployment from an application
 *
 * Features:
 * - Deployment removal
 * - Permission validation
 * - Cascading deletion
 *
 * Endpoint: DELETE /deployment
 * Authentication: Required (Admin or Owner)
 *
 * @throws {404} When app or deployment is not found
 * @returns {Object} Success message confirming deletion
 */
const DeleteDeploymentForAppRoute = createRoute({
	tags,
	path: "/deployment",
	method: "delete",
	description: "Removes a deployment from the specified application",
	request: { body: jsonContentRequired(AppNameDeploymentBodySchema, "Deployment details") },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNameDeploymentBodySchema),
			"Invalid request body",
		),
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.DEPLOYMENT_REMOVED("TestDeployment", "TestApp")),
			"Returns success message",
		),
	},
});

/**
 * Route Configuration for Rolling (Regenerating) Deployment Key
 * Creates a new key for an existing deployment
 *
 * Features:
 * - Key rotation
 * - Platform-specific key management
 * - Permission checking
 *
 * Endpoint: POST /deployment/roll-key
 * Authentication: Required (Admin only)
 *
 * @throws {404} When app or deployment is not found
 * @returns {Object} Message confirming key rolled
 */
const PostRollDeploymentKeyRoute = createRoute({
	tags,
	path: "/deployment/roll-key",
	method: "post",
	description: "Rolls (regenerates) a deployment key for a specific platform deployment",
	request: { body: jsonContentRequired(RollDeploymentKeyBodySchema, "Deployment to roll key for") },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(RollDeploymentKeyBodySchema),
			"Invalid request body",
		),
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.DEPLOYMENT_KEY_ROLLED("TestDeployment", "TestPlatform")),
			"Returns a message confirming the key was rolled",
		),
	},
});

/**
 * Route Configuration for Setting Custom Deployment Key
 * Sets a custom key for an existing deployment
 *
 * Features:
 * - Custom key provisioning
 * - Key validation
 * - Permission checking
 *
 * Endpoint: POST /deployment/custom-key
 * Authentication: Required (Admin only)
 *
 * @throws {404} When app or deployment is not found
 * @throws {400} When custom key is invalid
 * @returns {Object} Message confirming key was set
 */
const PostSetCustomDeploymentKeyRoute = createRoute({
	tags,
	path: "/deployment/custom-key",
	method: "post",
	description: "Sets a custom deployment key for a specific platform deployment",
	request: { body: jsonContentRequired(CustomDeploymentKeyBodySchema, "Custom key details") },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(CustomDeploymentKeyBodySchema),
			"Invalid request body",
		),
		[HttpStatusCodes.BAD_REQUEST]: textContent(
			createMessageSchema("Custom key must be between 16 and 64 characters"),
			"Invalid custom key",
		),
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.DEPLOYMENT_KEY_SET("TestDeployment", "TestPlatform")),
			"Returns a message confirming the key was set",
		),
	},
});

/**
 * Deployment Management Router Implementation
 * Combines all deployment management routes with their handlers
 *
 * Features:
 * - Permission validation
 * - Name uniqueness checking
 * - Platform-specific operations
 *
 * Security:
 * - Permission-based access control
 * - User scope validation
 * - Input sanitization
 *
 * @throws {401} When authentication fails
 * @throws {403} When permission check fails
 * @throws {404} When app or deployment not found
 * @throws {409} When deployment name conflicts
 */
const DeploymentRouter = createRouter()
	.openapi(GetAllDeploymentsForAppRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName } = c.req.valid("query");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const appWithPlatformsAndDeployments = await storage.codepush.getDeploymentsByAppId(collaboratorApp.appId);

		return c.json({ app: appWithPlatformsAndDeployments }, HttpStatusCodes.OK);
	})
	.openapi(GetDeploymentForAppPlatformRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform } = c.req.valid("query");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const appWithPlatformsAndDeployments = await storage.codepush.getDeploymentsByAppId(collaboratorApp.appId);

		const filteredPlatform = appWithPlatformsAndDeployments.platforms.find((p) => p.name === platform);

		const filteredDeployment = filteredPlatform!.deployments.find((d) => d.name === deploymentName);

		if (!filteredDeployment) {
			return c.text(`Deployment "${deploymentName}" not found`, HttpStatusCodes.NOT_FOUND);
		}

		return c.json({ deployment: filteredDeployment }, HttpStatusCodes.OK);
	})
	.openapi(PostAddDeploymentForAppRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName } = c.req.valid("json");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.OWNER);

		const trimmedDeploymentName = deploymentName.trim();

		await storage.codepush.throwIfDeploymentNameDuplicate(trimmedDeploymentName, collaboratorApp.appId);

		const appWithNewPlatformDeployments = await storage.codepush.addDeploymentByAppId(
			trimmedDeploymentName,
			collaboratorApp.appId,
		);

		return c.json({ app: appWithNewPlatformDeployments }, HttpStatusCodes.OK);
	})
	.openapi(DeleteDeploymentForAppRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName } = c.req.valid("json");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.ADMIN);

		await storage.codepush.deleteDeploymentByAppId(deploymentName, collaboratorApp.appId);

		return c.json({ message: `Deployment ${deploymentName} deleted` }, HttpStatusCodes.OK);
	})
	.openapi(PostRollDeploymentKeyRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform } = c.req.valid("json");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.ADMIN);

		const deployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		await storage.codepush.rollDeploymentKey(collaboratorApp.app.name, platform, deploymentName, deployment.key);

		return c.json({ message: STRINGS.DEPLOYMENT_KEY_ROLLED(deploymentName, platform) }, HttpStatusCodes.OK);
	})
	.openapi(PostSetCustomDeploymentKeyRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform, customKey } = c.req.valid("json");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.ADMIN);

		const deployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		await storage.codepush.setCustomDeploymentKey(deployment.key, customKey);

		return c.json({ message: STRINGS.DEPLOYMENT_KEY_SET(deploymentName, platform) }, HttpStatusCodes.OK);
	});

// PATCH /app/{appName}/deployment/{deploymentName}
// TODO:: implement this route if required
// DeploymentRouter.openapi(
// 	createRoute({
// 		tags,
// 		path: "/app/{appName}/deployment/{deploymentName}",
// 		method: "patch",
// 		request: {
// 			params: restIn.AppDeploymentPathSchema,
// 			body: jsonContentRequired(restIn.DeploymentRequestBodySchema, "The new deployment details"),
// 		},
// 		responses: {
// 			...APP_NOT_FOUND_RESPONSE,
// 			...PERMISSION_ERROR_RESPONSE,
// 			...DEPLOYMENT_NAME_CONFLICT_RESPONSE,
// 			[HttpStatusCodes.OK]: jsonContent(
// 				createMessageWithSuccessObjectSchema(STRINGS.DEPLOYMENT_UPDATED, true),
// 				"Returns success if updated",
// 			),
// 		},
// 	}),
// 	async (c) => {
// 		const storage = c.get("storage");
// 		const userId = c.get("user").id;

// 		const { appName, deploymentName } = c.req.valid("param");
// 		const { name } = c.req.valid("json");

// 		const app = await storage.getAppByName(userId, appName);

// 		storage.throwIfInvalidPermissions(app, userId, "Owner");

// 		const existingDeployment = await storage.getDeploymentByName(app.id, deploymentName);

// 		const trimmedNewDeploymentName = name.trim();

// 		await storage.isDeploymentNameDuplicate(app.id, trimmedNewDeploymentName);

// 		// TODO:: Add feat to update deployment key

// 		await storage.updateDeploymentById(app.id, {
// 			id: existingDeployment.id,
// 			name: trimmedNewDeploymentName,
// 			// key: existingDeployment.key,
// 		});

// 		return c.json(
// 			{ success: true, message: `Deployment Name updated from ${deploymentName} to ${trimmedNewDeploymentName}` },
// 			HttpStatusCodes.OK,
// 		);
// 	},
// );

export { DeploymentRouter };
