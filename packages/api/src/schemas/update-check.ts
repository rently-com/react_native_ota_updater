/**
 * Update Check Schema Module
 *
 * This module defines the schema for validating update check requests in the CodePush API.
 * It provides type-safe validation for query parameters used when clients check for available updates.
 *
 * Features:
 * - Request query parameter validation
 * - OpenAPI documentation generation
 * - Type inference for TypeScript
 * - Integration with common schema definitions
 *
 * The schema validates several key aspects of update checks:
 * - Deployment key authentication
 * - App version compatibility
 * - Client identification
 * - Companion app status
 * - Current package information
 */

import { z } from "zod";
import { LabelSchema } from "./common";

/**
 * Schema for validating update check request query parameters
 * Used when clients query the API to check for available updates
 *
 * Required Parameters:
 * - deployment_key: Authenticates the client's access to a specific deployment
 * - app_version: Current version of the requesting app
 * - client_unique_id: Unique identifier for the client device
 *
 * Optional Parameters:
 * - is_companion: Indicates if request is from a companion app
 * - label: Current version label of the installed package
 * - package_hash: Hash of the currently installed package
 *
 * @example
 * ```typescript
 * // Valid query parameters
 * UpdateCheckRequestQuerySchema.parse({
 *   deployment_key: "your-deployment-key",
 *   app_version: "1.0.0",
 *   client_unique_id: "device-id-123",
 *   label: "v1",
 *   package_hash: "hash123"
 * });
 *
 * // Minimal valid query
 * UpdateCheckRequestQuerySchema.parse({
 *   deployment_key: "key",
 *   app_version: "1.0.0",
 *   client_unique_id: "id"
 * });
 * ```
 */
export const UpdateCheckRequestQuerySchema = z
	.object({
		deployment_key: z.string().openapi({
			description: "The deployment key used to authenticate and identify the deployment environment",
			param: {
				in: "query",
				name: "deployment_key",
				required: true,
			},
		}),

		app_version: z.string().openapi({
			description: "The current version of the application requesting an update check",
			param: {
				in: "query",
				name: "app_version",
				required: true,
			},
		}),

		client_unique_id: z.string().openapi({
			description: "A unique identifier for the client device making the update check request",
			param: {
				in: "query",
				name: "client_unique_id",
				required: true,
			},
		}),

		is_companion: z.coerce
			.boolean()
			.nullish()
			.openapi({
				description: "Boolean flag indicating whether the request is a companion app",
				param: {
					in: "query",
					name: "is_companion",
				},
			}),

		label: LabelSchema.nullish()
			.default(null)
			.openapi({
				description: "The version label of the currently installed package (format: v1, v2, etc.)",
				param: {
					in: "query",
					name: "label",
				},
			}),

		package_hash: z
			.string()
			.nullish()
			.openapi({
				description: "The cryptographic hash of the currently installed package for version comparison",
				param: {
					in: "query",
					name: "package_hash",
				},
			}),
	})
	.openapi({ description: "Query parameters used to check for available updates for a specific deployment" });

/**
 * Type definition for update check request query parameters
 * Inferred from the Zod schema for type-safe usage in TypeScript
 */
export type UpdateCheckRequestQueryType = z.infer<typeof UpdateCheckRequestQuerySchema>;
