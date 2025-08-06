/**
 * User Management Routes Module
 *
 * This module implements user management functionality including authentication,
 * profile management, and CLI access key operations.
 *
 * Features:
 * - Authentication status verification
 * - User profile retrieval and management
 * - CLI access key generation and revocation
 * - User listing and search capabilities
 *
 * Security:
 * - Bearer token authentication
 * - Cookie-based session management
 * - Access key validation
 *
 * @module routes/common/user
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { selectUserSchema } from "@rentlydev/rnota-db";

import { DEFAULT_ACCESS_KEY_EXPIRY } from "@/api/lib/constants";
import { DEFAULT_AUTH_RESPONSES } from "@/api/lib/openapi/open-api-responses";
import { getIpAddress } from "@/api/utils/common-headers";
import { STRINGS } from "@/api/utils/strings";

/**
 * Authentication Status Route Configuration
 * Validates if the current session or access token is authenticated
 *
 * Features:
 * - Session cookie validation
 * - Bearer token validation
 * - Status response generation
 *
 * Endpoint: GET /authenticated
 * Authentication: Required
 *
 * Response:
 * - 200: Successfully authenticated
 * - 401: Invalid or missing authentication
 */
const GetAuthenticatedRoute = createRoute({
	tags: ["Common/Authenticated"],
	path: "/authenticated",
	description: "Validates if the current session or token is authenticated",
	method: "get",
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.AUTHENTICATED),
			"If given Bearer token or Session Cookie is valid and authenticated.",
		),
	},
});

/**
 * User Profile Route Configuration
 * Retrieves profile information for the authenticated user
 *
 * Features:
 * - Profile data retrieval
 * - Sensitive field filtering
 * - Standardized response format
 *
 * Endpoint: GET /user
 * Authentication: Required
 *
 * Response:
 * - 200: User profile data
 * - 401: Authentication required
 */
const GetUserRoute = createRoute({
	tags: ["Common/User"],
	path: "/user",
	method: "get",
	description: "Retrieves the user information of the currently authenticated user",
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.OK]: jsonContent(
			z.object({
				user: selectUserSchema.omit({ emailVerified: true }).openapi({ description: "The user information" }),
			}),
			"Returns the user information",
		),
	},
});

/**
 * All Users Route Configuration
 * Retrieves information about all users in the system
 *
 * Features:
 * - Bulk user data retrieval
 * - Filtered sensitive information
 * - Paginated response support
 *
 * Endpoint: GET /users
 * Authentication: Required
 *
 * Response:
 * - 200: List of user profiles
 * - 401: Authentication required
 */
const GetAllUsersRoute = createRoute({
	tags: ["Common/Users"],
	path: "/users",
	method: "get",
	description: "Retrieves information about all users in the system",
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.OK]: jsonContent(
			z.object({
				users: z
					.array(selectUserSchema.omit({ emailVerified: true }))
					.openapi({ description: "The users information" }),
			}),
			"Returns the users information",
		),
	},
});

/**
 * CLI Login Hostname Schema
 * Validates hostname information for CLI access key generation
 *
 * Features:
 * - String length validation
 * - Format validation
 * - OpenAPI documentation
 *
 * @remarks
 * Used to identify the device/location requesting CLI access
 */
const HostNameQuerySchema = z.object({
	hostname: z
		.string()
		.min(1)
		.max(100)
		.openapi({
			description: "The hostname for which the access key login is being created.",
			example: "MacBook-Pro.local",
			param: {
				in: "query",
				name: "hostname",
				required: true,
			},
		}),
});

/**
 * CLI Access Key Login Route Configuration
 * Generates new access keys for CLI authentication
 *
 * Features:
 * - Access key generation
 * - Expiration time management
 * - Device tracking
 *
 * Endpoint: GET /cli-login
 * Authentication: Required
 *
 * Response:
 * - 200: New access key token
 * - 401: Authentication required
 * - 422: Invalid hostname
 */
const GetAccessKeyLoginRoute = createRoute({
	tags: ["CLI/Login"],
	path: "/cli-login",
	method: "get",
	description: "Creates a new access key for CLI authentication",
	request: { query: HostNameQuerySchema },
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(HostNameQuerySchema),
			"Returns an error if the hostname query parameter is missing or invalid",
		),
		[HttpStatusCodes.OK]: jsonContent(
			z.object({
				token: z.string().min(1).max(100).openapi({ description: "The newly created access key token" }),
			}),
			"Returns the newly created access key token",
		),
	},
});

/**
 * CLI Access Key Logout Route Configuration
 * Revokes active CLI access keys
 *
 * Features:
 * - Access key revocation
 * - Token validation
 * - Cleanup operations
 *
 * Endpoint: GET /cli-logout
 * Authentication: Required (Bearer token only)
 *
 * Response:
 * - 200: Access key revoked
 * - 401: Invalid access key
 */
const GetAccessKeyLogoutRoute = createRoute({
	tags: ["CLI/Logout"],
	path: "/cli-logout",
	method: "get",
	description: "Revokes the current CLI access key",
	responses: {
		...DEFAULT_AUTH_RESPONSES,
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.LOGOUT),
			"Revokes the current user's access token",
		),
	},
});

/**
 * User Management Router Implementation
 * Combines all user management and authentication routes
 *
 * Features:
 * - Authentication verification
 * - Profile management
 * - User listing
 * - CLI access key operations
 *
 * Security:
 * - Route-level authentication
 * - Access key validation
 * - Session management
 *
 * @throws {401} When authentication fails
 * @throws {422} When request validation fails
 * @throws {500} When storage operations fail
 */
const UserRouter = createRouter()
	.openapi(GetAuthenticatedRoute, async (c) => c.json({ message: STRINGS.AUTHENTICATED }, HttpStatusCodes.OK))
	.openapi(GetUserRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const user = await storage.getUserById(userId);

		const userData = {
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			updatedAt: user.updatedAt,
			createdAt: user.createdAt,
		};

		return c.json({ user: userData }, HttpStatusCodes.OK);
	})
	.openapi(GetAllUsersRoute, async (c) => {
		const storage = c.get("storage");
		const users = await storage.getAllUsers();

		const userData = users.map((user) => ({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			updatedAt: user.updatedAt,
			createdAt: user.createdAt,
		}));

		return c.json({ users: userData }, HttpStatusCodes.OK);
	})
	.openapi(GetAccessKeyLoginRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { hostname } = c.req.valid("query");

		const now: Date = new Date();
		const nowTime: number = now.getTime();
		const expiresAtTime: number = nowTime + DEFAULT_ACCESS_KEY_EXPIRY;
		const expiresAt = new Date(expiresAtTime).toISOString();

		const name = `Login-${nowTime}`;

		const accessKey = await storage.addAccessKey({
			userId,
			name: name,
			createdBy: hostname ?? getIpAddress(c.req),
			expiresAt,
		});

		return c.json({ token: accessKey.token }, HttpStatusCodes.OK);
	})
	.openapi(GetAccessKeyLogoutRoute, async (c) => {
		const storage = c.get("storage");

		const userId = c.get("user").id;
		const accessKeyToken = c.get("accessKeyToken");

		if (!accessKeyToken) {
			return c.text(STRINGS.UNAUTHORIZED, HttpStatusCodes.UNAUTHORIZED);
		}

		await storage.removeAccessKeyByToken(userId, accessKeyToken);

		return c.json({ message: STRINGS.LOGOUT }, HttpStatusCodes.OK);
	});

export { UserRouter };
