/**
 * CodePush Metrics Schema Definition
 * This module defines the structure for tracking usage metrics of CodePush releases,
 * including installation success rates, active users, and failure tracking.
 */

import { relations } from "drizzle-orm";
import { integer, pgTable, serial } from "drizzle-orm/pg-core";
import { getCreatedAtSchema, getUpdatedAtSchema, tableActions } from "../_table";
import { codepush_release } from "./release";

/**
 * CodePush Metrics Table Schema
 * Represents usage statistics for a specific CodePush release
 *
 * Features:
 * - Auto-incrementing metric IDs
 * - One-to-one relationship with releases
 * - Tracks various success/failure counters
 * - Automatic cascade deletion with release
 * - Timestamp tracking for metric updates
 */
export const codepush_metrics = pgTable("codepush_metrics", {
	/** Auto-incrementing primary key */
	id: serial().primaryKey(),

	/** Reference to the associated release */
	releaseId: integer()
		.notNull()
		.unique()
		.references(() => codepush_release.id, tableActions),

	/** Number of devices actively running this release */
	activeCount: integer().notNull().default(0),

	/** Number of successful installations */
	installedCount: integer().notNull().default(0),

	/** Number of times the release was downloaded */
	downloadedCount: integer().notNull().default(0),

	/** Number of failed installations */
	failedCount: integer().notNull().default(0),

	// Include timestamp fields
	...getCreatedAtSchema(),
	...getUpdatedAtSchema(),
});

/**
 * CodePush Metrics Relationships
 * Defines the relationship between metrics and releases
 *
 * Relationships:
 * - release: The release these metrics belong to
 */
export const codepushMetricsRelations = relations(codepush_metrics, ({ one }) => ({
	release: one(codepush_release, {
		fields: [codepush_metrics.releaseId],
		references: [codepush_release.id],
	}),
}));
