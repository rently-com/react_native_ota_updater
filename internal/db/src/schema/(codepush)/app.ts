/**
 * CodePush Application Schema Definition
 * This module defines the structure for CodePush applications that can receive
 * over-the-air updates. Each application can have multiple platforms and collaborators.
 */

import { relations } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";

import { DEFAULT_APP_ICON_URL, getBaseSchema } from "../_table";
import { codepush_collaborator } from "./collaborator";
import { codepush_platform } from "./platform";

/**
 * CodePush Application Table Schema
 * Represents a CodePush-enabled application that can receive OTA updates
 *
 * Features:
 * - Unique application names
 * - Custom icon support with default fallback
 * - Standard timestamps (created_at, updated_at)
 * - Indexed name field for faster lookups
 */
export const codepush_app = pgTable(
	"codepush_app",
	{
		...getBaseSchema(),

		/** Unique name identifier for the application */
		name: text().notNull().unique(),
		iconUrl: text().default(DEFAULT_APP_ICON_URL),
	},
	(table) => [index("codepush_app_name_idx").on(table.name)],
);

/**
 * CodePush Application Relationships
 * Defines the relationships between applications and related entities
 *
 * Relationships:
 * - platforms: Different platform versions of the app (iOS, Android, etc.)
 * - collaborators: Users with access to manage the application
 */
export const codepushAppRelations = relations(codepush_app, ({ many }) => ({
	platforms: many(codepush_platform),
	collaborators: many(codepush_collaborator),
}));
