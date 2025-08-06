/**
 * OpenAPI Response Definitions Module
 * Provides standardized response definitions for OpenAPI routes
 * @module OpenAPIResponses
 */

import * as HttpStatusCodes from "stoker/http-status-codes";

import { STRINGS } from "@/api/utils/strings";
import { createMessageSchema, textContent } from "./schemas";

/**
 * Standard response for internal server errors (500)
 * Used as a default error response for all endpoints
 *
 * @constant {Object}
 * @property {Object} 500 - Internal server error response definition
 * @property {Object} 500.content - Response content with text/plain schema
 * @property {string} 500.description - Description of when this error occurs
 *
 * @example
 * ```typescript
 * // Use in route definition
 * router.openapi(route({
 *   responses: {
 *     200: successResponse,
 *     ...INTERNAL_SERVER_ERROR_RESPONSE
 *   }
 * }));
 * ```
 */
export const INTERNAL_SERVER_ERROR_RESPONSE = {
	[HttpStatusCodes.INTERNAL_SERVER_ERROR]: textContent(
		createMessageSchema(STRINGS.INTERNAL_SERVER_ERROR),
		"If for some reason the server encounters an error and is unable to process the request.",
	),
};

/**
 * Standard responses for authenticated endpoints
 * Combines unauthorized (401) and internal server error (500) responses
 *
 * @constant {Object}
 * @property {Object} 401 - Unauthorized response definition
 * @property {Object} 500 - Internal server error response (inherited)
 * @property {Object} 401.content - Response content with text/plain schema
 * @property {string} 401.description - Description of authentication failure cases
 *
 * Use Cases:
 * - Bearer token is missing
 * - Token is invalid or malformed
 * - Token has expired
 * - Server encounters an error
 *
 * @example
 * ```typescript
 * // Use in authenticated route definition
 * router.openapi(route({
 *   security: [{ Bearer: [] }],
 *   responses: {
 *     200: successResponse,
 *     ...DEFAULT_AUTH_RESPONSES
 *   }
 * }));
 * ```
 */
export const DEFAULT_AUTH_RESPONSES = {
	...INTERNAL_SERVER_ERROR_RESPONSE,
	[HttpStatusCodes.UNAUTHORIZED]: textContent(
		createMessageSchema(STRINGS.ACCESS_KEY.NOT_FOUND),
		"If given Bearer token is not found or is of invalid format or is valid but expired.",
	),
	[HttpStatusCodes.UPGRADE_REQUIRED]: textContent(
		createMessageSchema(STRINGS.CLI_VERSION_CHECKER.UPGRADE_REQUIRED("1.0.0", "1.0.1")),
		"If the CLI version is less than the server version.",
	),
};
