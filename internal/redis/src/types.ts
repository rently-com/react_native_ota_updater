/**
 * Type definitions for the Redis caching and update check system
 * @module RedisTypes
 */

import { z } from "zod";

/**
 * Schema for validating release update information
 * @const {z.ZodObject}
 */
const UpdateCheckReleaseSchema = z.object({
	/** Optional label identifying the release */
	label: z.string().optional(),
	/** Optional rollout percentage (0-100) */
	rollout: z.number().nullish(),
	/** Optional version of the app this release is for */
	appVersion: z.string().optional(),
	/** Optional size of the package in bytes */
	packageSize: z.number().optional(),
	/** Optional description of the release */
	description: z.string().optional(),
	/** Optional hash of the package for integrity verification */
	packageHash: z.string().optional(),
	/** Optional flag indicating if the update is mandatory */
	isMandatory: z.boolean().optional(),
	/** Optional flag indicating if the release is available */
	isAvailable: z.boolean().optional(),
	/** Optional URL where the update package can be downloaded */
	downloadURL: z.string().url().optional(),
	/** Optional flag indicating if the app version should be updated */
	updateAppVersion: z.boolean().optional(),
	/** Optional flag indicating if binary version should be executed */
	shouldRunBinaryVersion: z.boolean().optional(),
});

/** Type representing a release update information */
export type UpdateCheckReleaseType = z.infer<typeof UpdateCheckReleaseSchema>;

/**
 * Schema for validating update check responses
 * @const {z.ZodObject}
 */
export const UpdateCheckResponseSchema = z.object({
	/** Indicates if the response was served from cache */
	fromCache: z.boolean(),
	/** Update information with additional target binary range */
	updateInfo: UpdateCheckReleaseSchema.extend({
		/** Optional target binary version range */
		target_binary_range: z.string().optional(),
	}),
});

/** Type representing an update check response */
export type UpdateCheckResponseType = z.infer<typeof UpdateCheckResponseSchema>;

/**
 * Schema for validating release response with rollout information
 * @const {z.ZodObject}
 */
export const UpdateCheckReleaseResponseSchema = z.object({
	/** Optional rollout percentage */
	rollout: z.number().nullish().optional(),
	/** Release information */
	response: UpdateCheckReleaseSchema,
});

/** Type representing a release response with rollout information */
export type UpdateCheckReleaseResponseType = z.infer<typeof UpdateCheckReleaseResponseSchema>;

/**
 * Schema for validating cached release responses
 * @const {z.ZodObject}
 */
export const UpdateCheckReleaseCacheResponseSchema = z.object({
	/** Optional rollout percentage */
	rollout: z.number().nullish().optional(),
	/** Original package information */
	originalPackage: UpdateCheckReleaseSchema,
	/** Optional rollout package information */
	rolloutPackage: UpdateCheckReleaseSchema.optional(),
});

/** Type representing a cached release response */
export type UpdateCheckReleaseCacheResponseType = z.infer<typeof UpdateCheckReleaseCacheResponseSchema>;
