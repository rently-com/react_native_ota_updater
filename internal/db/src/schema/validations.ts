/**
 * Schema Validations Module
 *
 * This module provides Zod validation schemas for all database entities.
 * It includes schemas for selecting, inserting, and updating records,
 * as well as complex validation rules for related entities.
 *
 * Features:
 * - Type-safe database operations
 * - Runtime validation of input/output data
 * - Automatic type inference for TypeScript
 * - Support for complex nested object validation
 * - Relationship validation between entities
 */

import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { timestamps } from "./_table";

// ============================ CodePush ============================
import { codepush_app } from "./(codepush)/app";
import { codepush_collaborator } from "./(codepush)/collaborator";
import { codepush_deployment } from "./(codepush)/deployment";
import { codepush_metrics } from "./(codepush)/metrics";
import { codepush_platform } from "./(codepush)/platform";
import { codepush_release } from "./(codepush)/release";

// ============================ Common ============================
import { accessKey } from "./access-key";
import { account } from "./account";
import { session } from "./session";
import { user } from "./user";

/**
 * User Schema Validations
 * Provides validation schemas for user-related operations
 */
export const selectUserSchema = createSelectSchema(user).extend({});
export const insertUserSchema = createInsertSchema(user).extend({});
export const updateUserSchema = createUpdateSchema(user).extend({});

export type TUser = z.infer<typeof selectUserSchema>;
export type TInsertUser = z.infer<typeof insertUserSchema>;
export type TUpdateUser = z.infer<typeof updateUserSchema>;

/**
 * Session Schema Validations
 * Validates user session data for authentication
 */
export const selectSessionSchema = createSelectSchema(session).extend({});
export const insertSessionSchema = createInsertSchema(session).extend({});
export const updateSessionSchema = createUpdateSchema(session).extend({});

export type TSession = z.infer<typeof selectSessionSchema>;
export type TInsertSession = z.infer<typeof insertSessionSchema>;
export type TUpdateSession = z.infer<typeof updateSessionSchema>;

/**
 * Account Schema Validations
 * Handles account-related data validation
 */
export const selectAccountSchema = createSelectSchema(account).extend({});
export const insertAccountSchema = createInsertSchema(account).extend({});
export const updateAccountSchema = createUpdateSchema(account).extend({});

export type TAccount = z.infer<typeof selectAccountSchema>;
export type TInsertAccount = z.infer<typeof insertAccountSchema>;
export type TUpdateAccount = z.infer<typeof updateAccountSchema>;

/**
 * Access Key Schema Validations
 * Validates CLI access key data
 */
export const selectAccessKeySchema = createSelectSchema(accessKey).extend({});
export const insertAccessKeySchema = createInsertSchema(accessKey).omit({ token: true, ...timestamps });
export const updateAccessKeySchema = createUpdateSchema(accessKey)
	.pick({ token: true, name: true, expiresAt: true })
	.required({ token: true });

export type TAccessKey = z.infer<typeof selectAccessKeySchema>;
export type TInsertAccessKey = z.infer<typeof insertAccessKeySchema>;
export type TUpdateAccessKey = z.infer<typeof updateAccessKeySchema>;

// ============================ CodePush ============================

/**
 * CodePush App Schema Validations
 * Validates CodePush application data
 */
export const selectCodePushAppSchema = createSelectSchema(codepush_app).extend({});
export const insertCodePushAppSchema = createInsertSchema(codepush_app).extend({});
export const updateCodePushAppSchema = createUpdateSchema(codepush_app).extend({});

export type TCodePushApp = z.infer<typeof selectCodePushAppSchema>;
export type TInsertCodePushApp = z.infer<typeof insertCodePushAppSchema>;
export type TUpdateCodePushApp = z.infer<typeof updateCodePushAppSchema>;

/**
 * CodePush Platform Schema Validations
 * Handles platform-specific validation rules
 */
export const selectCodePushPlatformSchema = createSelectSchema(codepush_platform).extend({});
export const insertCodePushPlatformSchema = createInsertSchema(codepush_platform).extend({});
export const updateCodePushPlatformSchema = createUpdateSchema(codepush_platform).extend({});

export type TCodePushPlatform = z.infer<typeof selectCodePushPlatformSchema>;
export type TInsertCodePushPlatform = z.infer<typeof insertCodePushPlatformSchema>;
export type TUpdateCodePushPlatform = z.infer<typeof updateCodePushPlatformSchema>;

/**
 * CodePush App with Platforms Schema
 * Validates nested app and platform relationships
 */
export const selectCodePushAppWithPlatforms = selectCodePushAppSchema.extend({
	platforms: z.array(selectCodePushPlatformSchema),
});

export type TCodePushAppWithPlatforms = z.infer<typeof selectCodePushAppWithPlatforms>;

/**
 * CodePush Deployment Schema Validations
 * Validates deployment configuration data
 */
export const selectCodePushDeploymentSchema = createSelectSchema(codepush_deployment).extend({});
export const insertCodePushDeploymentSchema = createInsertSchema(codepush_deployment).extend({});
export const updateCodePushDeploymentSchema = createUpdateSchema(codepush_deployment).extend({});

export type TCodePushDeployment = z.infer<typeof selectCodePushDeploymentSchema>;
export type TInsertCodePushDeployment = z.infer<typeof insertCodePushDeploymentSchema>;
export type TUpdateCodePushDeployment = z.infer<typeof updateCodePushDeploymentSchema>;

/**
 * CodePush Platform with Deployments Schema
 * Validates platform and deployment relationships
 */
export const selectCodePushPlatformWithDeploymentsSchema = selectCodePushPlatformSchema.extend({
	deployments: z.array(selectCodePushDeploymentSchema),
});

export type TCodePushPlatformWithDeployments = z.infer<typeof selectCodePushPlatformWithDeploymentsSchema>;

/**
 * CodePush App with Platforms and Deployments Schema
 * Comprehensive validation for the complete app structure
 */
export const selectCodePushAppWithPlatformsAndDeploymentsSchema = selectCodePushAppSchema.extend({
	platforms: z.array(selectCodePushPlatformWithDeploymentsSchema),
});

export type TCodePushAppWithPlatformsAndDeployments = z.infer<
	typeof selectCodePushAppWithPlatformsAndDeploymentsSchema
>;

/**
 * CodePush Collaborator Schema Validations
 * Validates collaborator access and permissions
 */
export const selectCodePushCollaboratorSchema = createSelectSchema(codepush_collaborator).extend({});
export const insertCodePushCollaboratorSchema = createInsertSchema(codepush_collaborator).extend({});
export const updateCodePushCollaboratorSchema = createUpdateSchema(codepush_collaborator).extend({});

export type TCodePushCollaborator = z.infer<typeof selectCodePushCollaboratorSchema>;
export type TInsertCodePushCollaborator = z.infer<typeof insertCodePushCollaboratorSchema>;
export type TUpdateCodePushCollaborator = z.infer<typeof updateCodePushCollaboratorSchema>;

/**
 * CodePush Collaborator with App Schema
 * Validates collaborator-app relationships
 */
export const selectCodePushCollaboratorWithAppSchema = selectCodePushCollaboratorSchema.extend({
	app: selectCodePushAppSchema,
});

export type TCodePushCollaboratorWithApp = z.infer<typeof selectCodePushCollaboratorWithAppSchema>;

/**
 * CodePush Collaborator with User Schema
 * Validates collaborator-user relationships
 */
export const selectCodePushCollaboratorWithUserSchema = selectCodePushCollaboratorSchema.extend({
	user: selectUserSchema,
});

export type TCodePushCollaboratorWithUser = z.infer<typeof selectCodePushCollaboratorWithUserSchema>;

/**
 * CodePush Release Schema Validations
 * Validates release data and metadata
 */
export const selectCodePushReleaseSchema = createSelectSchema(codepush_release).extend({});
export const insertCodePushReleaseSchema = createInsertSchema(codepush_release).extend({});
export const updateCodePushReleaseSchema = selectCodePushReleaseSchema
	.partial()
	.pick({
		id: true,
		description: true,
		label: true,
		appVersion: true,
		rollout: true,
		isDisabled: true,
		isMandatory: true,
	})
	.required({ id: true });

export type TCodePushRelease = z.infer<typeof selectCodePushReleaseSchema>;
export type TInsertCodePushRelease = z.infer<typeof insertCodePushReleaseSchema>;
export type TUpdateCodePushRelease = z.infer<typeof updateCodePushReleaseSchema>;

/**
 * CodePush Metrics Schema Validations
 * Validates release metrics and analytics data
 */
export const selectCodePushMetricsSchema = createSelectSchema(codepush_metrics).extend({});
export const insertCodePushMetricsSchema = createInsertSchema(codepush_metrics).extend({});
export const updateCodePushMetricsSchema = createUpdateSchema(codepush_metrics).extend({});

export type TCodePushMetrics = z.infer<typeof selectCodePushMetricsSchema>;
export type TInsertCodePushMetrics = z.infer<typeof insertCodePushMetricsSchema>;
export type TUpdateCodePushMetrics = z.infer<typeof updateCodePushMetricsSchema>;

/**
 * Pre-commit CodePush Release Schema
 * Validates release data before committing to database
 */
export const PreCommitCodePushRelease = insertCodePushReleaseSchema.omit({
	...timestamps,
	id: true,
});
export type TPreCommitCodePushRelease = z.infer<typeof PreCommitCodePushRelease>;

/**
 * CodePush Release with User and Metrics Schema
 * Validates complete release data with relationships
 */
export const selectCodePushReleaseWithUserAndMetricsSchema = selectCodePushReleaseSchema.extend({
	releasedByUser: selectUserSchema,
	metrics: selectCodePushMetricsSchema.nullable(),
});
export type TCodePushReleaseWithUserAndMetrics = z.infer<typeof selectCodePushReleaseWithUserAndMetricsSchema>;

/**
 * CodePush Release Stats Schema
 * Validates release statistics data
 */
export const selectCodePushReleaseStatsSchema = z.object({
	appName: z.string(),
	platformName: z.string(),
	deploymentName: z.string(),
	releaseCount: z.number(),
});
export type TCodePushReleaseStats = z.infer<typeof selectCodePushReleaseStatsSchema>;
