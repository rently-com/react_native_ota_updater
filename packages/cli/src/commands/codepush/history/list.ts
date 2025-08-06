/**
 * Module for listing release history of CodePush deployments.
 * Displays detailed information about each release including metrics and status.
 * Supports platform-specific history viewing and formatted output.
 *
 * @module commands/codepush/history/list
 */

import { Args, Flags } from "@oclif/core";
import { Listr } from "listr2";

import CliTable3 from "cli-table3";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { formatRelativeDateFromNow } from "../../../lib/duration.js";
import { type Platform, type ReleaseHistory, ReleaseMethod } from "../../../services/codepush-sdk.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for listing deployment release history.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Platform-specific history viewing
 * - Detailed release information
 * - Installation metrics
 * - Release promotion tracking
 * - Rollback history
 * - Formatted table output
 */
export default class DeploymentHistoryList extends EnsureAuthCommand {
	static override description = "List the release history for a CodePush deployment";

	static override examples = [
		{
			description: "List iOS deployment history",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Production" -p ios',
		},
		{
			description: "List Android deployment history",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Staging" -p android',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to view history for.
	 * @property {string} deploymentName - Required. The name of the deployment to view history for.
	 */
	static override args = {
		appName: Args.string({ description: "Name of the CodePush app to view history for", required: true }),
		deploymentName: Args.string({ description: "Name of the deployment to view history for", required: true }),
	};

	/**
	 * Command flags definition.
	 * @property {string} platform - Required. The platform to view history for (ios/android).
	 */
	static override flags = {
		platform: Flags.string({
			char: "p",
			description: "Platform to view history for",
			options: ["ios", "android"],
			required: true,
		}),
	};

	/**
	 * Formats package metrics into a human-readable string.
	 * This method processes raw metrics data into a formatted string showing:
	 * - Active install percentage
	 * - Total installs
	 * - Pending updates
	 * - Rollback counts
	 * - Rollout percentage
	 *
	 * @param {ReleaseHistory[number]} packageObject - The release object containing metrics
	 * @returns {string} Formatted metrics string
	 */
	public getPackageMetricsString(packageObject: ReleaseHistory[number]): string {
		const rolloutString: string =
			packageObject?.rollout && packageObject.rollout !== 100
				? `\n${this.chalk.green("Rollout:")} ${packageObject.rollout.toLocaleString()}%`
				: "";

		if (!packageObject || !packageObject.metrics) {
			return this.chalk.magenta("No installs recorded").toString() + (rolloutString || "");
		}

		const { activeCount, downloadedCount, failedCount, installedCount } = packageObject.metrics;
		const totalActive: number = activeCount + downloadedCount - failedCount + installedCount;

		const activePercent: number = activeCount ? (activeCount / totalActive) * 100 : 0.0;
		let percentString: string;
		if (activePercent === 100.0) {
			percentString = "100%";
		} else if (activePercent === 0.0) {
			percentString = "0%";
		} else {
			percentString = `${activePercent.toPrecision(2)}%`;
		}

		const numPending: number = downloadedCount - installedCount - failedCount;

		// @ts-ignore
		let returnString = `${this.chalk.green("Active: ") + percentString} (${activeCount.toLocaleString()} of ${totalActive.toLocaleString()})\n${this.chalk.green("Total: ")}${installedCount.toLocaleString()}`;

		if (numPending > 0) {
			returnString += ` (${numPending.toLocaleString()} pending)`;
		}

		if (failedCount) {
			returnString += `\n${this.chalk.green("Rollbacks: ")}${this.chalk.red(`${failedCount.toLocaleString()}`)}`;
		}

		if (rolloutString) {
			returnString += rolloutString;
		}

		return returnString;
	}

	/**
	 * Executes the deployment history listing command.
	 * This method:
	 * 1. Fetches release history for the specified deployment
	 * 2. Creates a formatted table showing for each release:
	 *    - Label and version
	 *    - Release timing
	 *    - Release method (direct/promotion/rollback)
	 *    - Mandatory status
	 *    - Released by
	 *    - Description
	 *    - Installation metrics
	 * 3. Handles special cases:
	 *    - Disabled releases (dimmed)
	 *    - Promotions (shows source)
	 *    - Rollbacks (shows version info)
	 *
	 * The output provides a comprehensive view of:
	 * - Release progression
	 * - Update adoption
	 * - Release stability
	 * - Deployment activity
	 *
	 * @returns {Promise<void>} A promise that resolves when history is displayed
	 * @throws {Error} If history cannot be retrieved or user lacks permission
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(DeploymentHistoryList);

		const { appName, deploymentName } = args;
		const { platform } = flags;

		const tasks = new Listr([]);

		tasks.add({
			title: `Fetching Releases for App: ${appName} Deployment: ${deploymentName} Platform: ${platform}`,
			task: async () => {
				const releaseHistory = await sdk.codepush.getDeploymentHistory(appName, deploymentName, platform as Platform);

				if (releaseHistory.length === 0) {
					this.log("No releases found for this deployment.");
					return;
				}

				const table = new CliTable3({
					head: ["Label", "Release Time", "App Version", "Mandatory", "Released By", "Description", "Install Metrics"],
				});

				for (const release of releaseHistory) {
					let row = [];
					let releaseTime: string = formatRelativeDateFromNow(release.createdAt);
					let releaseSource = "";

					if (release.releaseMethod === ReleaseMethod.PROMOTE) {
						releaseSource = `Promoted ${release.originalLabel} from "${release.originalDeploymentName}"`;
					} else if (release.releaseMethod === ReleaseMethod.ROLLBACK) {
						const labelNumber: number = Number.parseInt(release.label.substring(1));
						const lastLabel: string = `v${labelNumber - 1}`;
						releaseSource = `Rolled back ${lastLabel} to ${release.originalLabel}`;
					}

					if (releaseSource) {
						releaseTime += `\n${this.chalk.magenta(`(${releaseSource})`).toString()}`;
					}

					row = [
						release.label,
						releaseTime,
						release.appVersion,
						release.isMandatory ? "Yes" : "No",
						release.releasedByUser.email,
						release.description,
						this.getPackageMetricsString(release) +
							(release.isDisabled ? `\n${this.chalk.green("Disabled:")} Yes` : ""),
					];

					if (release.isDisabled) {
						row = row.map((cell) => this.chalk.dim(cell));
					}

					if (!release.isVerified) {
						row = row.map((cell) => this.chalk.red.dim(cell));
					}

					table.push(row);
				}

				this.log(table.toString());
			},
		});

		await tasks.run();

		return;
	}
}
