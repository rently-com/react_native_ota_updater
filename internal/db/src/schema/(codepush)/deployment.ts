/**
 * CodePush Deployment Schema Definition
 * This module defines the structure for deployment environments (e.g., Production, Staging)
 * within platform-specific configurations of CodePush applications.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, unique } from "drizzle-orm/pg-core";

import { generateId, tableActions } from "../_table";
import { codepush_platform } from "./platform";
import { codepush_release } from "./release";

/**
 * CodePush Deployment Table Schema
 * Represents a deployment environment for a specific platform of a CodePush application
 *
 * Features:
 * - Auto-generated 32-character deployment keys
 * - Named environments (e.g., "Production", "Staging", "Beta")
 * - Unique deployment names per platform
 * - Automatic cascade deletion with platform
 * - Tracks release history
 */
export const codepush_deployment = pgTable(
	"codepush_deployment",
	{
		/** Unique deployment key used for client configuration */
		key: text()
			.$defaultFn(() => generateId(32))
			.primaryKey()
			.notNull(),

		/** Name of the deployment environment */
		name: text().notNull(),

		/** Reference to the parent platform */
		platformId: text()
			.notNull()
			.references(() => codepush_platform.id, tableActions),
	},
	(table) => [
		// Ensure unique deployment names per platform
		unique("codepush_deployment_name_platform_unique").on(table.name, table.platformId),
	],
);

/**
 * CodePush Deployment Relationships
 * Defines the relationships between deployments and related entities
 *
 * Relationships:
 * - platform: The parent platform configuration
 * - releases: The release history for this deployment
 */
export const codepushDeploymentRelations = relations(codepush_deployment, ({ one, many }) => ({
	platform: one(codepush_platform, {
		fields: [codepush_deployment.platformId],
		references: [codepush_platform.id],
	}),
	releases: many(codepush_release),
}));
