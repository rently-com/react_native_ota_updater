/**
 * API Client module for making type-safe HTTP requests to the backend
 * Uses Hono client for efficient API communication
 * @module APIClient
 */

import type { router } from "@rentlydev/rnota-api/routes";

import { hc } from "hono/client";

/**
 * Base API client instance with empty base URL
 * Used as a template for creating configured clients
 *
 * @const {Client}
 * @private
 */
const client = hc<router>("");

/**
 * Type definition for the API client
 * Inherits all type information from the API router
 * Provides full type safety for requests and responses
 *
 * @typedef {typeof client} Client
 */
export type Client = typeof client;

/**
 * Creates a new API client instance with the specified configuration
 *
 * @param {...Parameters<typeof hc>} args - Configuration parameters for the Hono client
 * @returns {Client} Configured API client instance
 *
 * @example
 * ```typescript
 * // Create a client with base URL
 * const api = createClient('https://api.example.com');
 *
 * // Make type-safe API calls
 * const response = await api.users.get();
 * const user = await api.users.$post({
 *   json: { name: 'John', email: 'john@example.com' }
 * });
 * ```
 */
export default (...args: Parameters<typeof hc>): Client => hc<router>(...args);

/**
 * Error response schema for API errors
 * Currently commented out but preserved for future use
 *
 * @typedef {Object} ErrorSchema
 * @property {Object} error - Error details
 * @property {Array<Object>} error.issues - List of validation or error issues
 * @property {string} error.issues[].code - Error code
 * @property {Array<string|number>} error.issues[].path - Path to the error in the request
 * @property {string} [error.issues[].message] - Optional error message
 * @property {string} error.name - Name of the error
 * @property {boolean} success - Always false for errors
 */
// export type ErrorSchema = {
// 	error: {
// 		issues: {
// 			code: string;
// 			path: (string | number)[];
// 			message?: string | undefined;
// 		}[];
// 		name: string;
// 	};
// 	success: boolean;
// };
