/**
 * API Constants module
 * Defines path constants and configuration values used throughout the API
 * @module APIConstants
 */

/**
 * Base path prefix for all API routes
 * @constant {"/api"}
 */
export const BASE_API_PATH = "/api" as const;

/**
 * Path prefix for CodePush related endpoints
 * @constant {"/codepush"}
 */
export const CODEPUSH_PATH = "/codepush" as const;

/**
 * Path prefix for Acquisition SDK endpoints
 * Used for client update checks and downloads
 * @constant {"/acquisition"}
 */
export const ACQUISITION_PATH = "/acquisition" as const;

/**
 * Path prefix for Management SDK endpoints
 * Used for deployment and app management
 * @constant {"/management"}
 */
export const MANAGEMENT_PATH = "/management" as const;

/**
 * Path prefix for public CodePush endpoints
 * Used by the Acquisition SDK for public access
 * @constant {"/v0.1/public/codepush"}
 */
export const ACQUISITION_CODEPUSH_PUBLIC_PATH = "/v0.1/public/codepush" as const;

/**
 * Default expiration time for access keys in milliseconds (60 days)
 * @constant {number}
 */
export const DEFAULT_ACCESS_KEY_EXPIRY = 1000 * 60 * 60 * 24 * 60; // 60 days in milliseconds

// import * as HttpStatusPhrases from "stoker/http-status-phrases";
// import { createMessageObjectSchema } from "stoker/openapi/schemas";

/**
 * Zod validation error messages
 * Currently commented out but preserved for future use
 * @const {Object}
 */
// export const ZOD_ERROR_MESSAGES = {
// 	REQUIRED: "Required",
// 	EXPECTED_NUMBER: "Expected number, received nan",
// 	NO_UPDATES: "No updates provided",
// };

/**
 * Zod error codes
 * Currently commented out but preserved for future use
 * @const {Object}
 */
// export const ZOD_ERROR_CODES = {
// 	INVALID_UPDATES: "invalid_updates",
// };

/**
 * Not found response schema
 * Currently commented out but preserved for future use
 * @const {Object}
 */
// export const notFoundSchema = createMessageObjectSchema(HttpStatusPhrases.NOT_FOUND);
