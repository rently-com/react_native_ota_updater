/**
 * Common Schema Definitions
 * This module defines shared enums and types used across the database schema
 */

import { pgEnum } from "drizzle-orm/pg-core";

/**
 * User Permission Levels
 * Defines the different levels of access control in the system
 * @const {Object}
 */
export const Permission = {
	/**
	 * Full system access
	 * - Can view, create, edit and delete all apps, deployments and releases
	 * - Can manage and delete all users and their permissions
	 * - Can create new and edit existing releases
	 * - Can promote and rollback releases to PROD
	 */
	ADMIN: "admin" as const,
	/**
	 * Full access to owned resources
	 * - Can view, create and edit all apps and deployments
	 * - Can manage and delete all users and their permissions below or equal to their own level
	 * - Can create new and edit existing releases
	 * - Can promote and rollback releases to PROD
	 */
	OWNER: "owner" as const,
	/**
	 * Limited access based on granted permissions
	 * - Can view all apps and deployments
	 * - Can manage and delete users and their permissions below or equal to their own level
	 * - Can create new and edit existing releases to NON-PROD
	 */
	COLLABORATOR: "collaborator" as const,
} as const;

/** Type definition for Permission values */
export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * PostgreSQL enum for permission levels
 * Used in database columns to enforce valid permission values
 */
export const permissionsEnum = pgEnum("permissions_enum", [
	Permission.ADMIN,
	Permission.OWNER,
	Permission.COLLABORATOR,
]);

/**
 * Release Methods
 * Defines the different ways a release can be created
 * @const {Object}
 */
export const ReleaseMethod = {
	/** Direct upload of a new release */
	UPLOAD: "upload" as const,
	/** Promotion of an existing release to a new deployment */
	PROMOTE: "promote" as const,
	/** Rollback to a previous release */
	ROLLBACK: "rollback" as const,
} as const;

/** Type definition for ReleaseMethod values */
export type ReleaseMethod = (typeof ReleaseMethod)[keyof typeof ReleaseMethod];

/**
 * PostgreSQL enum for release methods
 * Used in database columns to enforce valid release method values
 */
export const releaseMethodsEnum = pgEnum("release_methods_enum", [
	ReleaseMethod.UPLOAD,
	ReleaseMethod.PROMOTE,
	ReleaseMethod.ROLLBACK,
]);
