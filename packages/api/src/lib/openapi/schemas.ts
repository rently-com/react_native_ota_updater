/**
 * OpenAPI Schema Utilities Module
 * Provides utility functions for creating OpenAPI schema definitions
 * @module OpenAPISchemas
 */

import { z } from "@hono/zod-openapi";
import type { ZodSchema } from "zod";

/**
 * Creates a text content response schema with description
 * Used for defining text/plain response types in OpenAPI
 *
 * @template T - Type extending ZodSchema
 * @param {T} schema - Zod schema for the response
 * @param {string} description - Description of the response
 * @returns {Object} OpenAPI content object with schema and description
 *
 * @example
 * ```typescript
 * const errorResponse = textContent(
 *   z.string(),
 *   'Error message when the request fails'
 * );
 *
 * // Use in route definition
 * router.openapi(route({
 *   responses: {
 *     400: errorResponse
 *   }
 * }));
 * ```
 */
export const textContent = <T extends ZodSchema>(schema: T, description: string) => {
	return {
		content: { "text/plain": { schema } },
		description,
	};
};

/**
 * Creates a message schema with an example value
 * Used for defining string-based message responses
 *
 * @param {string} [exampleError="Example Message"] - Example message to include in OpenAPI docs
 * @returns {z.ZodString} Zod string schema with OpenAPI example
 *
 * @example
 * ```typescript
 * const notFoundSchema = createMessageSchema('Resource not found');
 *
 * // Use in response definition
 * const notFoundResponse = textContent(
 *   notFoundSchema,
 *   'Response when resource is not found'
 * );
 * ```
 */
export const createMessageSchema = (exampleError = "Example Message") => {
	return z.string().openapi({ example: exampleError });
};
