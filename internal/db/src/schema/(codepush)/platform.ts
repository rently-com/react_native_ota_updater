/**
 * CodePush Platform Schema Definition
 * This module defines the structure for platform-specific configurations
 * within CodePush applications (iOS and Android).
 */

import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, unique } from "drizzle-orm/pg-core";

import { getIdSchema, tableActions } from "../_table";
import { codepush_app } from "./app";
import { codepush_deployment } from "./deployment";

/**
 * Supported Platform Types
 * Defines the available platform options for CodePush applications
 * @const {Object}
 */
export const Platform = {
	/** iOS platform */
	IOS: "ios" as const,
	/** Android platform */
	ANDROID: "android" as const,
} as const;

/** Type definition for Platform values */
export type Platform = (typeof Platform)[keyof typeof Platform];

/**
 * PostgreSQL enum for platform types
 * Used in database columns to enforce valid platform values
 */
export const platformsEnum = pgEnum("platforms_enum", [Platform.IOS, Platform.ANDROID]);

/**
 * CodePush Platform Table Schema
 * Represents a specific platform configuration for a CodePush application
 *
 * Features:
 * - Unique platform per application
 * - Platform-specific deployments
 * - Automatic cascade deletion with application
 * - Standard ID field
 */
export const codepush_platform = pgTable(
	"codepush_platform",
	{
		// Include ID field
		...getIdSchema(),

		/** Platform type (ios/android) */
		name: platformsEnum().notNull(),

		/** Reference to the parent application */
		appId: text()
			.notNull()
			.references(() => codepush_app.id, tableActions),
	},
	(table) => [
		// Ensure unique platform per application
		unique("codepush_platform_name_app_unique").on(table.name, table.appId),
	],
);

/**
 * CodePush Platform Relationships
 * Defines the relationships between platforms and related entities
 *
 * Relationships:
 * - app: The parent CodePush application
 * - deployments: The platform's deployment configurations
 */
export const codepushPlatformRelations = relations(codepush_platform, ({ one, many }) => ({
	app: one(codepush_app, {
		fields: [codepush_platform.appId],
		references: [codepush_app.id],
	}),
	deployments: many(codepush_deployment),
}));
