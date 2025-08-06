/**
 * CodePush Release Schema Definition
 * This module defines the structure for managing over-the-air updates (releases)
 * within CodePush deployments. It tracks release metadata, content, and deployment status.
 */

import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";

import { getCreatedAtSchema, getUpdatedAtSchema, tableActions } from "../_table";
import { ReleaseMethod, releaseMethodsEnum } from "../common";
import { user } from "../user";
import { codepush_deployment } from "./deployment";
import { codepush_metrics } from "./metrics";

/**
 * CodePush Release Table Schema
 * Represents a specific version of an application that can be deployed
 * to client devices through CodePush's OTA update mechanism
 *
 * Features:
 * - Auto-incrementing release IDs
 * - Release metadata (version, description, size)
 * - Deployment controls (rollout, mandatory updates)
 * - Release tracking (creation, updates, metrics)
 * - Support for promotions and rollbacks
 */
export const codepush_release = pgTable(
	"codepush_release",
	{
		/** Auto-incrementing primary key */
		id: serial().primaryKey(),

		// Include timestamp fields
		...getCreatedAtSchema(),
		...getUpdatedAtSchema(),

		/** Hash of the release package contents */
		packageHash: text().notNull(),

		/** Optional release notes */
		description: text(),

		/** Release version label */
		label: text().notNull(),

		/** Target application version */
		appVersion: text().notNull(),

		/** Percentage of users who should receive this update */
		rollout: integer(),

		/** Whether this release has been disabled */
		isDisabled: boolean().notNull().default(false),

		/** Whether this update must be installed */
		isMandatory: boolean().notNull().default(false),

		/** How this release was created (upload/promote/rollback) */
		releaseMethod: releaseMethodsEnum().notNull().default(ReleaseMethod.UPLOAD),

		/** Size of the release package in bytes */
		size: integer().notNull(),

		/** Reference to the stored release package */
		blobId: text().notNull(),

		/** Whether the release has been verified */
		isVerified: boolean().notNull().default(false),

		// Promotion/Rollback tracking
		/** Original label when promoted/rolled back */
		originalLabel: text(),
		/** Original deployment name when promoted/rolled back */
		originalDeploymentName: text(),

		/** Reference to the user who created this release */
		releasedByUserId: text()
			.notNull()
			.references(() => user.id),

		/** Reference to the deployment this release belongs to */
		deploymentId: text()
			.notNull()
			.references(() => codepush_deployment.key, tableActions),
	},
	(table) => [
		// Indexes for performance
		index("codepush_release_label_idx").on(table.label),
		// Ensure unique labels per deployment
		unique("codepush_release_label_deployment_unique").on(table.label, table.deploymentId),
	],
);

/**
 * CodePush Release Relationships
 * Defines the relationships between releases and related entities
 *
 * Relationships:
 * - deployment: The deployment this release belongs to
 * - metrics: Usage metrics for this release
 * - releasedByUser: The user who created this release
 */
export const codepushReleaseRelations = relations(codepush_release, ({ one }) => ({
	deployment: one(codepush_deployment, {
		fields: [codepush_release.deploymentId],
		references: [codepush_deployment.key],
	}),
	metrics: one(codepush_metrics),
	releasedByUser: one(user, {
		fields: [codepush_release.releasedByUserId],
		references: [user.id],
	}),
}));
