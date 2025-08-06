/**
 * CodePush Metrics Manager
 * This module handles tracking and updating usage metrics for CodePush releases,
 * including downloads, installations, failures, and active usage.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { codepush_metrics, codepush_release } from "../schema";
import { decrementOrZero, increment } from "../schema/_table";
import type { TCodePushMetrics } from "../schema/validations";

/**
 * Deployment Status Constants
 * Defines the possible states of a release deployment
 */
export const DEPLOYMENT_STATUS = {
	/** Release is currently active on device */
	ACTIVE: "Active" as const,
	/** Release has been downloaded but not installed */
	DOWNLOADED: "Downloaded" as const,
	/** Release was successfully installed */
	DEPLOYMENT_SUCCEEDED: "DeploymentSucceeded" as const,
	/** Release installation failed */
	DEPLOYMENT_FAILED: "DeploymentFailed" as const,
} as const;

/** Type definition for deployment status values */
export type DEPLOYMENT_STATUS = (typeof DEPLOYMENT_STATUS)[keyof typeof DEPLOYMENT_STATUS];

/** Type for metric counter fields in the database */
type StatusField = keyof Pick<TCodePushMetrics, "activeCount" | "downloadedCount" | "installedCount" | "failedCount">;

/**
 * Represents a metric update operation
 */
export interface MetricUpdate {
	deploymentKey: string;
	label: string;
	status: DEPLOYMENT_STATUS;
	operation: "increment" | "decrement";
}

/**
 * Queue configuration for batch processing
 */
interface QueueConfig {
	batchSize: number;
	flushIntervalMs: number;
}

/**
 * Metrics Manager Class
 * Handles tracking and updating metrics for CodePush releases
 */
export class MetricsManager {
	private updateQueue: MetricUpdate[] = [];
	private queueTimer: NodeJS.Timeout | null = null;
	private queueConfig: QueueConfig = {
		batchSize: 1000, // Process up to 1000 updates at once
		flushIntervalMs: 5000, // Flush every 5 seconds if batch size not reached
	};

	// Prepared queries for common operations
	private readonly findReleaseStmt = db
		.select()
		.from(codepush_release)
		.where(
			and(
				eq(codepush_release.deploymentId, sql.placeholder("deploymentId")),
				eq(codepush_release.label, sql.placeholder("label")),
			),
		)
		.prepare("find-release-by-key-and-label");

	constructor(config?: Partial<QueueConfig>) {
		if (config) {
			this.queueConfig = { ...this.queueConfig, ...config };
		}
		this.startQueueProcessor();
	}

	private startQueueProcessor() {
		if (this.queueTimer) {
			clearInterval(this.queueTimer);
		}

		this.queueTimer = setInterval(() => this.flushQueue(), this.queueConfig.flushIntervalMs);
	}

	private async flushQueue(): Promise<void> {
		if (this.updateQueue.length === 0) return;

		const batchToProcess = this.updateQueue.splice(0, this.queueConfig.batchSize);
		if (batchToProcess.length > 0) {
			try {
				await this.batchIncrementStatusCounts(batchToProcess);
			} catch (error) {
				// On error, put items back in queue for retry
				this.updateQueue.unshift(...batchToProcess);
				throw error;
			}
		}
	}

	/**
	 * Queues a metric update for batch processing
	 * @param {MetricUpdate} update - The metric update to queue
	 */
	private queueUpdate(update: MetricUpdate): void {
		this.updateQueue.push(update);

		// If we've reached batch size, process immediately
		if (this.updateQueue.length >= this.queueConfig.batchSize) {
			this.flushQueue();
		}
	}

	/**
	 * Force flush the queue immediately
	 * Useful for testing or when immediate processing is required
	 */
	public async forceFlush(): Promise<void> {
		await this.flushQueue();
	}

	/**
	 * Cleanup queue processor
	 * Should be called when shutting down the service
	 */
	public cleanup(): void {
		if (this.queueTimer) {
			clearInterval(this.queueTimer);
			this.queueTimer = null;
		}
	}

	/**
	 * Maps deployment status to corresponding database field
	 * @param {DEPLOYMENT_STATUS} status - The deployment status to map
	 * @returns {StatusField} Corresponding database field name
	 * @private
	 */
	private getStatusFieldInDb(status: DEPLOYMENT_STATUS): StatusField {
		switch (status) {
			case DEPLOYMENT_STATUS.ACTIVE:
				return "activeCount";
			case DEPLOYMENT_STATUS.DOWNLOADED:
				return "downloadedCount";
			case DEPLOYMENT_STATUS.DEPLOYMENT_SUCCEEDED:
				return "installedCount";
			case DEPLOYMENT_STATUS.DEPLOYMENT_FAILED:
				return "failedCount";
		}
	}

	/**
	 * Batch processes multiple metric updates in a single transaction
	 * @param {MetricUpdate[]} updates - Array of metric updates to process
	 * @throws {StorageError} If any release is not found
	 */
	public async batchIncrementStatusCounts(updates: MetricUpdate[]): Promise<void> {
		if (updates.length === 0) return;

		// Use a Map to deduplicate release queries by deploymentKey and label
		const releaseQueriesMap = new Map<string, { deploymentKey: string; label: string }>();
		updates.forEach((update) => {
			const key = `${update.deploymentKey}:${update.label}`;
			if (!releaseQueriesMap.has(key)) {
				releaseQueriesMap.set(key, { deploymentKey: update.deploymentKey, label: update.label });
			}
		});

		// Find all releases using prepared statement
		const releases = await Promise.all(
			Array.from(releaseQueriesMap.values()).map((query) =>
				this.findReleaseStmt
					.execute({ deploymentId: query.deploymentKey, label: query.label })
					.then((releases) => releases[0]),
			),
		);

		// Create a map of deployment+label to release id for quick lookup
		const releaseMap = new Map<string, number>();
		Array.from(releaseQueriesMap.entries()).forEach(([key, _], index) => {
			const release = releases[index];
			if (!release) {
				const [deploymentKey, label] = key.split(":");
				console.log(`Release not found: ${deploymentKey}:${label}`);
				return;
			}
			releaseMap.set(key, release.id);
		});

		// Group updates by releaseId, status, and operation
		const updatesByRelease = new Map<number, Record<string, { increment: number; decrement: number }>>();

		updates.forEach((update) => {
			const key = `${update.deploymentKey}:${update.label}`;
			const releaseId = releaseMap.get(key);
			if (!releaseId) return;

			const field = this.getStatusFieldInDb(update.status);
			const existing = updatesByRelease.get(releaseId) || {};
			if (!existing[field]) {
				existing[field] = { increment: 0, decrement: 0 };
			}

			if (update.operation === "increment") {
				existing[field].increment++;
			} else {
				existing[field].decrement++;
			}

			updatesByRelease.set(releaseId, existing);
		});

		// Execute all updates in a single transaction
		await db.transaction(async (tx) => {
			const promises = Array.from(updatesByRelease.entries()).map(([releaseId, fields]) =>
				tx
					.insert(codepush_metrics)
					.values({
						releaseId,
						...Object.fromEntries(Object.entries(fields).map(([field, ops]) => [field, ops.increment - ops.decrement])),
					})
					.onConflictDoUpdate({
						target: [codepush_metrics.releaseId],
						set: Object.fromEntries(
							Object.entries(fields).map(([field, ops]) => [
								field,
								ops.decrement > 0
									? decrementOrZero(codepush_metrics[field as StatusField], ops.decrement)
									: increment(codepush_metrics[field as StatusField], ops.increment),
							]),
						),
					}),
			);

			await Promise.all(promises);
		});
	}

	/**
	 * Increments a specific metric counter for a release
	 * @param {string} deploymentKey - The deployment key
	 * @param {string} label - The release label
	 * @param {DEPLOYMENT_STATUS} status - The status to increment
	 * @throws {StorageError} If release not found
	 */
	public async incrementLabelStatusCount(
		deploymentKey: string,
		label: string,
		status: DEPLOYMENT_STATUS,
	): Promise<void> {
		this.queueUpdate({ deploymentKey, label, status, operation: "increment" });
	}

	/**
	 * Decrements a specific metric counter for a release
	 * @param {string} deploymentKey - The deployment key
	 * @param {string} label - The release label
	 * @param {DEPLOYMENT_STATUS} status - The status to decrement
	 * @throws {StorageError} If release not found
	 */
	public async decrementLabelStatusCount(
		deploymentKey: string,
		label: string,
		status: DEPLOYMENT_STATUS,
	): Promise<void> {
		this.queueUpdate({ deploymentKey, label, status, operation: "decrement" });
	}

	/**
	 * Records a release update, updating metrics for both current and previous releases
	 * @param {string} currentDeploymentKey - The current deployment key
	 * @param {string} currentLabel - The current release label
	 * @param {string} [previousDeploymentKey] - The previous deployment key
	 * @param {string} [previousLabel] - The previous release label
	 * @throws {StorageError} If release not found
	 */
	public async recordUpdate(
		currentDeploymentKey: string,
		currentLabel: string,
		previousDeploymentKey?: string,
		previousLabel?: string,
	): Promise<void> {
		// Queue updates for current release
		this.queueUpdate({
			deploymentKey: currentDeploymentKey,
			label: currentLabel,
			status: DEPLOYMENT_STATUS.ACTIVE,
			operation: "increment",
		});
		this.queueUpdate({
			deploymentKey: currentDeploymentKey,
			label: currentLabel,
			status: DEPLOYMENT_STATUS.DEPLOYMENT_SUCCEEDED,
			operation: "increment",
		});

		// Queue update for previous release if exists
		if (previousDeploymentKey && previousLabel) {
			this.queueUpdate({
				deploymentKey: previousDeploymentKey,
				label: previousLabel,
				status: DEPLOYMENT_STATUS.ACTIVE,
				operation: "decrement",
			});
		}
	}
}
