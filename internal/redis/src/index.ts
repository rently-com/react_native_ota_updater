/**
 * Redis module for handling caching and deployment metrics in the OTA update system.
 * @module RedisModule
 */

import { Redis } from "ioredis";

import env from "./env";
import type { UpdateCheckReleaseCacheResponseType } from "./types";

/**
 * Custom error class for Redis client-related errors
 * @class RedisClientError
 * @extends Error
 */
class RedisClientError extends Error {
	public error: Error;

	constructor(message: string, error: Error) {
		super(message);
		this.name = "RedisClientError";
		this.error = error;
	}
}

/**
 * Enum-like object defining possible deployment statuses
 * @readonly
 */
export const DEPLOYMENT_STATUS = {
	ACTIVE: "Active" as const,
	DOWNLOADED: "Downloaded" as const,
	DEPLOYMENT_SUCCEEDED: "DeploymentSucceeded" as const,
	DEPLOYMENT_FAILED: "DeploymentFailed" as const,
} as const;

export type DEPLOYMENT_STATUS = (typeof DEPLOYMENT_STATUS)[keyof typeof DEPLOYMENT_STATUS];

/**
 * Interface representing a cacheable response object
 * @interface CacheableResponse
 */
export interface CacheableResponse {
	body: UpdateCheckReleaseCacheResponseType;
}

/**
 * Interface representing deployment metrics with status counts
 * @interface DeploymentMetrics
 */
export interface DeploymentMetrics {
	[labelStatus: string]: number;
}

/**
 * Utility functions for Redis operations
 * @namespace RedisUtilities
 */
export const RedisUtilities = {
	/**
	 * Validates if a given status is a valid deployment status
	 * @param {string} status - The status to validate
	 * @returns {boolean} True if status is valid, false otherwise
	 */
	isValidDeploymentStatus(status: string): boolean {
		return (
			status === DEPLOYMENT_STATUS.DEPLOYMENT_SUCCEEDED ||
			status === DEPLOYMENT_STATUS.DEPLOYMENT_FAILED ||
			status === DEPLOYMENT_STATUS.DOWNLOADED
		);
	},

	/**
	 * Generates a field name for a label-status combination
	 * @param {string} label - The deployment label
	 * @param {DEPLOYMENT_STATUS} status - The deployment status
	 * @returns {string | null} The generated field name or null if status is invalid
	 */
	getLabelStatusField(label: string, status: DEPLOYMENT_STATUS): string | null {
		if (RedisUtilities.isValidDeploymentStatus(status)) {
			return `${label}:${status}`;
		}

		return null;
	},

	/**
	 * Generates a field name for active count of a label
	 * @param {string} label - The deployment label
	 * @returns {string} The generated field name
	 */
	getLabelActiveCountField(label: string): string {
		return `${label}:${DEPLOYMENT_STATUS.ACTIVE}`;
	},

	/**
	 * Generates a Redis hash key for a deployment
	 * @param {string} deploymentKey - The deployment key
	 * @returns {string} The generated hash key
	 */
	getDeploymentKeyHash(deploymentKey: string): string {
		return `deploymentKey:${deploymentKey}`;
	},

	/**
	 * Generates a Redis hash key for deployment labels
	 * @param {string} deploymentKey - The deployment key
	 * @returns {string} The generated hash key
	 */
	getDeploymentKeyLabelsHash(deploymentKey: string): string {
		return `deploymentKeyLabels:${deploymentKey}`;
	},

	/**
	 * Generates a Redis hash key for deployment clients
	 * @param {string} deploymentKey - The deployment key
	 * @returns {string} The generated hash key
	 */
	getDeploymentKeyClientsHash(deploymentKey: string): string {
		return `deploymentKeyClients:${deploymentKey}`;
	},
};

/**
 * Manager class for Redis operations in the OTA update system
 * Handles caching, metrics tracking, and deployment status management
 * @class RedisManager
 */
export class RedisManager {
	private static DEFAULT_EXPIRY = 60 * 60; // one hour, specified in seconds
	private cacheClient: Redis;

	constructor() {
		this.cacheClient = new Redis(env.REDIS_URL);

		this.cacheClient.on("error", (err) => {
			console.error("Redis Client Error", err);

			throw new RedisClientError("Redis client error", err);
		});

		this.initializeClient();
	}

	private async initializeClient(): Promise<void> {
		await this.cacheClient.set("health", "health");
	}

	/**
	 * Checks the health of the Redis connection.
	 *
	 * @throws {RedisClientError} If the health check fails.
	 *
	 * @returns {Promise<void>} A promise that resolves if the health check is successful.
	 */
	public async checkHealth(): Promise<void> {
		try {
			const pingResponse = await this.cacheClient.ping();

			if (pingResponse !== "PONG") {
				throw new Error("Redis health check failed");
			}

			return;
		} catch (pingError) {
			console.error("RedisManager ~ checkHealth ~ pingError:", pingError);

			throw new RedisClientError("Redis health check failed", pingError as Error);
		}
	}

	/**
	 * Gets all keys currently set in Redis.
	 *
	 * @returns {Promise<string[]>} Array of all key names in Redis
	 * @throws {RedisClientError} If there is an error scanning keys
	 */
	public async getAllKeys(): Promise<Array<{ key: string; value: string | null }>> {
		try {
			const stream = this.cacheClient.scanStream({
				count: 100,
			});

			const keysAndValues: Array<{ key: string; value: string | null }> = [];

			for await (const resultKeys of stream) {
				for (const key of resultKeys) {
					try {
						const type = await this.cacheClient.type(key);
						let value: string | null = null;

						if (type === "string") {
							value = await this.cacheClient.get(key);
						} else if (type === "hash") {
							const hashValues = await this.cacheClient.hgetall(key);
							value = JSON.stringify(hashValues);
						}

						keysAndValues.push({ key, value });
					} catch (keyError) {
						console.warn(`Error getting value for key ${key}:`, keyError);
						keysAndValues.push({ key, value: null });
					}
				}
			}

			return keysAndValues;
		} catch (error) {
			console.error("RedisManager ~ getAllKeys ~ error:", error);
			throw new RedisClientError("Failed to scan Redis keys", error as Error);
		}
	}

	/**
	 * Retrieves a cached response from the cache client if possible, otherwise return null.
	 *
	 * @param {string} expiryKey - The key used to identify the cache expiry.
	 * @param {string} url - The URL for which the cached response is being retrieved.
	 * @returns {Promise<CacheableResponse | null>} - A promise that resolves to the cached response if found, or null if not found or caching is disabled.
	 */
	public async getCachedResponse(expiryKey: string, url: string): Promise<CacheableResponse | null> {
		const serializedResponse = await this.cacheClient.hget(expiryKey, url);

		return serializedResponse ? (JSON.parse(serializedResponse) as CacheableResponse) : null;
	}

	/**
	 * Caches the given response associated with the specified URL under the provided expiry key.
	 * If caching is disabled or the cache client is not available, the function returns immediately.
	 *
	 * @param {string} expiryKey - The key under which the response will be cached that you can later use to expire.
	 * @param {string} url - The URL associated with the response to be cached.
	 * @param {CacheableResponse} response - The response object to be cached.
	 * @returns {Promise<void>} A promise that resolves when the response has been cached.
	 */
	public async setCachedResponse(expiryKey: string, url: string, response: CacheableResponse): Promise<void> {
		const serializedResponse = JSON.stringify(response);
		const isNewKey = !(await this.cacheClient.exists(expiryKey));

		await this.cacheClient.hset(expiryKey, url, serializedResponse);

		if (isNewKey) {
			await this.cacheClient.expire(expiryKey, RedisManager.DEFAULT_EXPIRY);
		}
	}

	/**
	 * Increments the count of a specific status for a given deployment label in the cache.
	 *
	 * @param deploymentKey - The key identifying the deployment.
	 * @param label - The label for which the status count needs to be incremented.
	 * @param status - The status whose count needs to be incremented.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete
	 */
	public async incrementLabelStatusCount(
		deploymentKey: string,
		label: string,
		status: DEPLOYMENT_STATUS,
	): Promise<void> {
		const hash = RedisUtilities.getDeploymentKeyLabelsHash(deploymentKey);
		const field = RedisUtilities.getLabelStatusField(label, status);

		if (field) {
			await this.cacheClient.hincrby(hash, field, 1);
		}
	}

	/**
	 * Clears the metrics associated with a given deployment key from the cache.
	 *
	 * @param deploymentKey - The deployment key for which the metrics should be cleared.
	 * @returns {Promise<void>} A promise that resolves when the metrics have been cleared.
	 */
	public async clearMetricsForDeploymentKey(deploymentKey: string): Promise<void> {
		await this.cacheClient.del([
			RedisUtilities.getDeploymentKeyLabelsHash(deploymentKey),
			RedisUtilities.getDeploymentKeyClientsHash(deploymentKey),
		]);
	}

	/**
	 * Retrieves deployment metrics associated with a given deployment key.
	 *
	 * @param deploymentKey - The key identifying the deployment for which metrics are to be retrieved.
	 * @returns {Promise<DeploymentMetrics | null>} A promise that resolves to an object containing deployment metrics, or null if the cache client is not enabled or not available.
	 */
	public async getMetricsWithDeploymentKey(deploymentKey: string): Promise<DeploymentMetrics | null> {
		const rawMetrics = await this.cacheClient.hgetall(RedisUtilities.getDeploymentKeyLabelsHash(deploymentKey));

		const metrics: DeploymentMetrics = {};
		for (const [key, value] of Object.entries(rawMetrics)) {
			if (!Number.isNaN(value)) {
				metrics[key] = +value;
			}
		}

		return metrics;
	}

	/**
	 * Records an update to the deployment labels in the cache.
	 *
	 * @param currentDeploymentKey - The key of the current deployment.
	 * @param currentLabel - The label of the current deployment.
	 * @param previousDeploymentKey - The key of the previous deployment (optional).
	 * @param previousLabel - The label of the previous deployment (optional).
	 * @returns {Promise<void>} A promise that resolves when the update has been recorded.
	 *
	 * This method increments the active count and deployment succeeded count for the current deployment label.
	 * If a previous deployment key and label are provided, it decrements the active count for the previous deployment label.
	 */
	public async recordUpdate(
		currentDeploymentKey: string,
		currentLabel: string,
		previousDeploymentKey?: string,
		previousLabel?: string,
	): Promise<void> {
		const multi = this.cacheClient.multi();
		const currentDeploymentKeyLabelsHash = RedisUtilities.getDeploymentKeyLabelsHash(currentDeploymentKey);
		const currentLabelActiveField = RedisUtilities.getLabelActiveCountField(currentLabel);
		const currentLabelDeploymentSucceededField = RedisUtilities.getLabelStatusField(
			currentLabel,
			DEPLOYMENT_STATUS.DEPLOYMENT_SUCCEEDED,
		);

		if (currentLabelActiveField) {
			multi.hincrby(currentDeploymentKeyLabelsHash, currentLabelActiveField, 1);
		}
		if (currentLabelDeploymentSucceededField) {
			multi.hincrby(currentDeploymentKeyLabelsHash, currentLabelDeploymentSucceededField, 1);
		}

		if (previousDeploymentKey && previousLabel) {
			const previousDeploymentKeyLabelsHash = RedisUtilities.getDeploymentKeyLabelsHash(previousDeploymentKey);
			const previousLabelActiveField = RedisUtilities.getLabelActiveCountField(previousLabel);

			if (previousLabelActiveField) {
				multi.hincrby(previousDeploymentKeyLabelsHash, previousLabelActiveField, -1);
			}
		}

		await multi.exec();
	}

	/**
	 * Removes the active label for a client associated with a specific deployment key.
	 *
	 * @param deploymentKey - The deployment key associated with the client.
	 * @param clientUniqueId - The unique identifier of the client.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async removeDeploymentKeyClientActiveLabel(deploymentKey: string, clientUniqueId: string): Promise<void> {
		const deploymentKeyClientsHash = RedisUtilities.getDeploymentKeyClientsHash(deploymentKey);

		await this.cacheClient.hdel(deploymentKeyClientsHash, clientUniqueId);
	}

	/**
	 * Invalidates the cache for a given key.
	 *
	 * @param {string} expiryKey - The key for which the cache should be invalidated.
	 * @returns {Promise<void>} A promise that resolves when the cache has been invalidated.
	 */
	public async invalidateCache(expiryKey: string): Promise<void> {
		await this.cacheClient.del(expiryKey);
	}

	// For unit tests only
	public async close(): Promise<void> {
		if (this.cacheClient) {
			await this.cacheClient.quit();
		}
	}
}
