/**
 * Access Key Routes Module
 *
 * This module provides API routes for managing access keys in the system.
 * Access keys are used for authentication and authorization purposes.
 *
 * Features:
 * - Create, read, update, and delete access keys
 * - Manage access key expiration
 * - Filter access keys by creator
 * - Bulk operations for access key management
 *
 * Security:
 * - Access key tokens are masked in responses
 * - TTL (Time To Live) validation
 * - Duplicate name prevention
 * - User-scoped operations
 *
 * @module AccessKeyRoutes
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { selectAccessKeySchema } from "@rentlydev/rnota-db";
import { formatRelative } from "date-fns";

import { DEFAULT_ACCESS_KEY_EXPIRY } from "@/api/lib/constants";
import { DEFAULT_AUTH_RESPONSES } from "@/api/lib/openapi/open-api-responses";
import { createMessageSchema, textContent } from "@/api/lib/openapi/schemas";
import { STRINGS } from "@/api/utils/strings";

const tags = ["AccessKeys"];

/**
 * Standard response object for access key not found errors
 * @constant {object}
 */
const ACCESS_KEY_NOT_FOUND_RESPONSE = {
	...DEFAULT_AUTH_RESPONSES,
	[HttpStatusCodes.NOT_FOUND]: textContent(createMessageSchema(STRINGS.ACCESS_KEY.NOT_FOUND), "Access key not found"),
};

/**
 * Standard response object for access key name conflicts
 * @constant {object}
 */
const ACCESS_KEY_NAME_CONFLICT_RESPONSE = {
	[HttpStatusCodes.CONFLICT]: textContent(
		createMessageSchema(STRINGS.ACCESS_KEY.CONFLICT_NAME("Test")),
		"Access key with name already exists",
	),
};

// =====================================================================================================================

/**
 * Formats a date relative to the current time
 * @param {Date | string} date - The date to format
 * @returns {string} A human-readable relative time string
 */
const formatRelativeDateFromNow = (date: Date | string): string => {
	return formatRelative(date, new Date());
};

/**
 * Schema for validating Time To Live (TTL) values
 * Ensures TTL is a non-negative integer or null
 */
const TtlSchema = z.number().int().min(0).nullish().openapi({
	description:
		"The time to live for the access key in milliseconds. If not provided, defaults to system default expiry time.",
});

/**
 * Schema for single access key response
 * Includes full access key details with masked token
 */
const AccessKeyResponseSchema = z.object({ accessKey: selectAccessKeySchema }).openapi({
	description: "Returns the access key details with masked token for security",
});

/**
 * Schema for multiple access keys response
 * Returns array of access keys with masked tokens
 */
const AccessKeysResponseSchema = z.object({ accessKeys: z.array(selectAccessKeySchema) }).openapi({
	description: "Returns an array of access keys with masked tokens, sorted by creation date",
});

/**
 * Schema for delete access key request body
 * Requires the name of the access key to delete
 */
const DeleteAccessKeyBodySchema = z
	.object({
		name: z.string().openapi({
			description: "The unique name of the access key to delete",
		}),
	})
	.openapi({
		description: "Request body for deleting an access key by name",
	});

/**
 * Schema for creating new access key
 * Includes optional TTL, required name and creator information
 */
const AddAccessKeyBodySchema = z
	.object({
		ttl: TtlSchema,
		name: z.string().openapi({
			description: "The unique name for the new access key",
		}),
		createdBy: z.string().openapi({
			description: "The machine hostname or identifier that created the access key",
		}),
	})
	.openapi({
		description: "Request body for creating a new access key with optional expiration",
	});

/**
 * Schema for updating access key properties
 * Supports renaming and TTL modification
 */
const PatchAccessKeyBodySchema = z
	.object({
		ttl: TtlSchema,
		oldName: z.string().openapi({
			description: "The current name of the access key to update",
		}),
		newName: z.string().optional().openapi({
			description: "Optional new name for the access key",
		}),
	})
	.openapi({
		description: "Request body for updating an access key's name or TTL",
	});

/**
 * Route to get all access keys for the authenticated user
 * Returns a list of access keys with masked tokens, sorted by creation date
 */
const GetAllAccessKeysRoute = createRoute({
	tags,
	path: "/accessKeys",
	method: "get",
	description: "Get all access keys for the authenticated user",
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.OK]: jsonContent(
			AccessKeysResponseSchema,
			"Returns a sorted list of all access keys for the user",
		),
	},
});

/**
 * Route to delete all access keys for the authenticated user
 * Removes all access keys associated with the user's account
 */
const DeleteAllAccessKeysRoute = createRoute({
	tags,
	path: "/accessKeys",
	method: "delete",
	description: "Delete all access keys for the authenticated user",
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.ACCESS_KEYS_REMOVED),
			"Confirms successful deletion of all access keys",
		),
	},
});

/**
 * Route to delete access keys by creator
 * Removes all access keys created by a specific machine/hostname
 */
/**
 * Schema for validating the createdBy parameter in delete access keys route
 */
const DeleteAccessKeysCreatedByParamsSchema = z.object({
	createdBy: z.string().openapi({
		description: "The machine hostname or identifier that created the access keys to delete",
		param: {
			in: "path",
			name: "createdBy",
			required: true,
		},
	}),
});

/**
 * Route to delete access keys by creator
 * Removes all access keys created by a specific machine/hostname
 */
const DeleteAccessKeysCreatedByRoute = createRoute({
	tags,
	path: "/accessKeys/{createdBy}",
	method: "delete",
	description: "Delete all access keys created by a specific machine/hostname",
	request: {
		params: DeleteAccessKeysCreatedByParamsSchema,
	},
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.NOT_FOUND]: textContent(
			createMessageSchema(STRINGS.ACCESS_KEYS_CREATED_BY_NOT_FOUND("Test")),
			"No access keys found for the specified creator",
		),
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.ACCESS_KEYS_CREATED_BY_REMOVED("Test")),
			"Confirms successful deletion of access keys for the specified creator",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(DeleteAccessKeysCreatedByParamsSchema),
			"Invalid request parameters",
		),
	},
});

/**
 * Route to create a new access key
 * Creates an access key with specified name, creator, and optional TTL
 */
const PostAddAccessKeyRoute = createRoute({
	tags,
	path: "/accessKey",
	method: "post",
	description: "Create a new access key with specified parameters",
	request: {
		body: jsonContentRequired(AddAccessKeyBodySchema, "Details for the new access key"),
	},
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		...ACCESS_KEY_NAME_CONFLICT_RESPONSE,
		[HttpStatusCodes.CREATED]: jsonContent(
			AccessKeyResponseSchema,
			"Returns the newly created access key with masked token",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AddAccessKeyBodySchema),
			"Invalid request parameters",
		),
	},
});

/**
 * Route to update an existing access key
 * Supports updating the name and TTL of an access key
 */
const PatchAccessKeyRoute = createRoute({
	tags,
	path: "/accessKey",
	method: "patch",
	description: "Update an existing access key's properties",
	request: {
		body: jsonContentRequired(PatchAccessKeyBodySchema, "Updated access key details"),
	},
	responses: {
		...ACCESS_KEY_NOT_FOUND_RESPONSE,
		...ACCESS_KEY_NAME_CONFLICT_RESPONSE,
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.ACCESS_KEY_UPDATED),
			"Confirms successful update of the access key",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(PatchAccessKeyBodySchema),
			"Invalid request parameters",
		),
	},
});

/**
 * Route to delete a specific access key by name
 * Removes a single access key identified by its name
 */
const DeleteAccessKeyRoute = createRoute({
	tags,
	path: "/accessKey",
	method: "delete",
	description: "Delete a specific access key by name",
	request: {
		body: jsonContentRequired(DeleteAccessKeyBodySchema, "Details of the access key to delete"),
	},
	responses: {
		...ACCESS_KEY_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.ACCESS_KEY_REMOVED("Test")),
			"Confirms successful deletion of the access key",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(DeleteAccessKeyBodySchema),
			"Invalid request parameters",
		),
	},
});

// const GetAccessKeyByNameRoute = createRoute({
// 	tags,
// 	path: "/accessKey/{accessKeyName}",
// 	method: "get",
// 	request: {
// 		params: AccessKeyPathSchema,
// 	},
// 	responses: {
// 		...ACCESS_KEY_NOT_FOUND_RESPONSE,
// 		[HttpStatusCodes.OK]: jsonContent(AccessKeyResponseSchema, "Returns the access key"),
// 	},
// });

/**
 * Access Key Router
 * Combines all access key routes and implements their handlers
 */
const AccessKeyRouter = createRouter()
	/**
	 * GET /accessKeys
	 * Retrieves all access keys for the authenticated user
	 */
	.openapi(GetAllAccessKeysRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const accessKeys = await storage.getAccessKeysByUserId(userId);

		// Sort access keys by creation date (newest first)
		accessKeys.sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());

		return c.json({ accessKeys: accessKeys }, HttpStatusCodes.OK);
	})
	/**
	 * DELETE /accessKeys
	 * Removes all access keys for the authenticated user
	 */
	.openapi(DeleteAllAccessKeysRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		await storage.removeAccessKeys(userId);

		return c.json({ message: STRINGS.ACCESS_KEYS_REMOVED }, HttpStatusCodes.OK);
	})
	/**
	 * DELETE /accessKeys/{createdBy}
	 * Removes all access keys created by a specific machine/hostname
	 */
	.openapi(DeleteAccessKeysCreatedByRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const createdBy = c.req.param("createdBy");

		const accessKeys = await storage.getAccessKeysByUserId(userId);
		const accessKeysToDelete = accessKeys.filter((accessKey) => accessKey.createdBy === createdBy);

		if (accessKeysToDelete.length === 0) {
			return c.text(STRINGS.ACCESS_KEYS_CREATED_BY_NOT_FOUND(createdBy), HttpStatusCodes.NOT_FOUND);
		}

		for (const accessKey of accessKeysToDelete) {
			await storage.removeAccessKeyByToken(userId, accessKey.token);
		}

		return c.json({ message: STRINGS.ACCESS_KEYS_CREATED_BY_REMOVED(createdBy) }, HttpStatusCodes.OK);
	})
	/**
	 * POST /accessKey
	 * Creates a new access key with the specified parameters
	 */
	.openapi(PostAddAccessKeyRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { name, createdBy, ttl } = c.req.valid("json");
		const trimmedName = name.trim();

		const now: Date = new Date();
		const nowTime: number = now.getTime();
		const expiresAtTime: number = nowTime + (ttl ?? DEFAULT_ACCESS_KEY_EXPIRY);
		const expiresAt = new Date(expiresAtTime).toISOString();

		const accessKey = await storage.addAccessKey({
			userId,
			name: trimmedName,
			createdBy,
			expiresAt,
		});

		return c.json({ accessKey: accessKey }, HttpStatusCodes.CREATED);
	})
	/**
	 * PATCH /accessKey
	 * Updates an existing access key's properties
	 */
	.openapi(PatchAccessKeyRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { newName, ttl, oldName } = c.req.valid("json");

		const accessKeyToUpdate = await storage.getAccessKeyByName(userId, oldName);

		let newAccessKeyName = undefined;
		let expiresAt = undefined;

		if (newName) {
			newAccessKeyName = newName.trim();
		}

		if (ttl) {
			expiresAt = new Date(new Date().getTime() + ttl).toISOString();
		}

		const accessKey = await storage.updateAccessKeyByToken(userId, {
			token: accessKeyToUpdate.token,
			name: newAccessKeyName,
			expiresAt: expiresAt,
		});

		let successMessage = "";

		if (newAccessKeyName && expiresAt) {
			successMessage = `Access key name updated from ${oldName} to ${accessKey.name} and expiry updated to ${formatRelativeDateFromNow(accessKey.expiresAt)} from now.`;
		} else if (newName) {
			successMessage = `Access key name updated from ${oldName} to ${accessKey.name}.`;
		} else if (expiresAt) {
			successMessage = `Access key expiry updated to ${formatRelativeDateFromNow(accessKey.expiresAt)} from now.`;
		} else {
			successMessage = STRINGS.ACCESS_KEY_UPDATED;
		}

		return c.json({ message: successMessage }, HttpStatusCodes.OK);
	})
	/**
	 * DELETE /accessKey
	 * Removes an access key by name
	 */
	.openapi(DeleteAccessKeyRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { name } = c.req.valid("json");

		const accessKey = await storage.getAccessKeyByName(userId, name);

		await storage.removeAccessKeyByToken(userId, accessKey.token);

		return c.json({ message: STRINGS.ACCESS_KEY_REMOVED(accessKey.name) }, HttpStatusCodes.OK);
	});
// .openapi(getAccessKeyRoute, async (c) => {
// 	const storage = c.get("storage");
// 	const userId = c.get("user").id;

// 	const { accessKeyName } = c.req.valid("param");

// 	const accessKey = await storage.getAccessKeyByName(userId, accessKeyName);

// 	return c.json({ accessKey: accessKey }, HttpStatusCodes.OK);
// })

export { AccessKeyRouter };
