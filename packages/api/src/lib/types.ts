/**
 * API Types module
 * Defines TypeScript types and interfaces used throughout the API
 * @module APITypes
 */

import type { OpenAPIHono } from "@hono/zod-openapi";
// import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";

import type { PinoLogger } from "hono-pino";

import type { StorageManager } from "@rentlydev/rnota-db";
import type { TAccessKey, TUser } from "@rentlydev/rnota-db";
import type { RedisManager } from "@rentlydev/rnota-redis";

import type { BASE_API_PATH } from "@/api/lib/constants";

/**
 * User context interface for authenticated requests
 * Contains essential user information from the database
 *
 * @interface ContextUser
 * @property {TUser["id"]} id - User's unique identifier
 * @property {TUser["email"]} email - User's email address
 */
interface ContextUser {
	id: TUser["id"];
	email: TUser["email"];
}

/**
 * Application bindings interface for Hono
 * Defines the types of variables available in the request context
 *
 * @interface AppBindings
 * @property {Object} Variables - Context variables available in request handlers
 * @property {PinoLogger} Variables.logger - Pino logger instance
 * @property {RedisManager} Variables.redis - Redis manager instance
 * @property {StorageManager} Variables.storage - Storage manager instance
 * @property {ContextUser} Variables.user - Authenticated user context
 * @property {TAccessKey["token"]} Variables.accessKeyToken - Access key token for CLI authentication
 */
export interface AppBindings {
	Variables: {
		logger: PinoLogger;

		redis: RedisManager;
		storage: StorageManager;

		user: ContextUser;
		accessKeyToken: TAccessKey["token"]; // Bearer Auth Context [CLI]
	};
}

/**
 * OpenAPI-enabled Hono application type
 * Extends Hono with OpenAPI support and application bindings
 *
 * @typedef {OpenAPIHono<AppBindings, {}, typeof BASE_API_PATH>} AppOpenAPI
 */
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type AppOpenAPI = OpenAPIHono<AppBindings, {}, typeof BASE_API_PATH>;

/**
 * Route handler type for OpenAPI routes
 * Currently commented out but preserved for future use
 *
 * @typedef {RouteHandler<RouteConfig, AppBindings>} AppRouteHandler
 */
// export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
