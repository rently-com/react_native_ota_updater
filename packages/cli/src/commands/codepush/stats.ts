/**
 * Module for displaying CodePush release statistics.
 * Retrieves and displays statistics about CodePush releases,
 * showing the number of releases for each app's platform's deployment.
 *
 * @module commands/codepush/stats
 */

import { Listr } from "listr2";

import CliTable3 from "cli-table3";
import { EnsureAuthCommand } from "../../common/ensure-auth-command.js";
import { sdk } from "../../services/management-sdk.js";

export default class CodepushStats extends EnsureAuthCommand {
	static override description = "Display CodePush release statistics";

	static override examples = ["<%= config.bin %> <%= command.id %>", "<%= config.bin %> <%= command.id %> --json"];

	/**
	 * Executes the statistics command.
	 * Fetches release statistics from the API and displays them in a formatted table.
	 *
	 * @returns {Promise<void>} A promise that resolves when the command completes
	 * @throws {Error} If the API request fails or authentication is invalid
	 */
	public async run(): Promise<void> {
		const tasks = new Listr([]);

		tasks.add({
			title: "Fetching release statistics...",
			task: async () => {
				const releaseStats = await sdk.codepush.getReleaseStats();

				if (releaseStats.length === 0) {
					this.log("No release statistics found.");
					return;
				}

				// Create grouped table using CliTable3
				this.displayGroupedTable(releaseStats);

				// Display summary
				this.displaySummary(releaseStats);
			},
		});

		await tasks.run();

		return;
	}

	/**
	 * Displays the statistics in a grouped table using CliTable3
	 *
	 * @param {Array} stats - Array of release statistics
	 * @private
	 */
	private displayGroupedTable(
		stats: Array<{
			appName: string;
			platformName: string;
			deploymentName: string;
			releaseCount: string | number;
		}>,
	): void {
		this.log("\n📊 CodePush Release Statistics");
		this.log("=".repeat(80));

		// Group data by app and platform
		const groupedData = this.groupStatsByAppAndPlatform(stats);

		// Create the main table
		const table = new CliTable3({
			head: ["App", "Platform", "Deployment", "Release Count"],
			colWidths: [20, 10, 20, 15],
			chars: {
				top: "═",
				"top-mid": "╤",
				"top-left": "╔",
				"top-right": "╗",
				bottom: "═",
				"bottom-mid": "╧",
				"bottom-left": "╚",
				"bottom-right": "╝",
				left: "║",
				"left-mid": "╟",
				mid: "─",
				"mid-mid": "┼",
				right: "║",
				"right-mid": "╢",
				middle: "│",
			},
		});

		// Add grouped data to table
		for (const [appName, platforms] of Object.entries(groupedData)) {
			let isFirstApp = true;

			for (const [platformName, deployments] of Object.entries(platforms)) {
				for (const deployment of deployments) {
					const releaseCount =
						typeof deployment.releaseCount === "string"
							? Number.parseInt(deployment.releaseCount)
							: deployment.releaseCount;
					const countDisplay = releaseCount > 0 ? `${releaseCount} releases` : "No releases";

					// Add app name only for first row of each app
					const appDisplay = isFirstApp ? appName : "";
					const platformDisplay = platformName === "ios" ? "📱 iOS" : "🤖 Android";

					table.push([appDisplay, platformDisplay, deployment.deploymentName, countDisplay]);
					isFirstApp = false;
				}
			}

			// Add separator row between apps
			if (Object.keys(groupedData).indexOf(appName) < Object.keys(groupedData).length - 1) {
				table.push([{ content: "─".repeat(18), colSpan: 4 }]);
			}
		}

		this.log(table.toString());
	}

	/**
	 * Groups statistics by app and platform for better readability
	 *
	 * @param {Array} stats - Array of release statistics
	 * @returns {Object} Grouped statistics
	 * @private
	 */
	private groupStatsByAppAndPlatform(
		stats: Array<{
			appName: string;
			platformName: string;
			deploymentName: string;
			releaseCount: string | number;
		}>,
	) {
		const grouped: Record<
			string,
			Record<string, Array<{ deploymentName: string; releaseCount: string | number }>>
		> = {};

		for (const stat of stats) {
			if (!grouped[stat.appName]) {
				grouped[stat.appName] = {};
			}
			if (!grouped[stat.appName][stat.platformName]) {
				grouped[stat.appName][stat.platformName] = [];
			}
			grouped[stat.appName][stat.platformName].push({
				deploymentName: stat.deploymentName,
				releaseCount: stat.releaseCount,
			});
		}

		return grouped;
	}

	/**
	 * Displays summary statistics
	 *
	 * @param {Array} stats - Array of release statistics
	 * @private
	 */
	private displaySummary(
		stats: Array<{
			appName: string;
			platformName: string;
			deploymentName: string;
			releaseCount: string | number;
		}>,
	): void {
		const totalReleases = stats.reduce((sum, stat) => {
			const count = typeof stat.releaseCount === "string" ? Number.parseInt(stat.releaseCount) : stat.releaseCount;
			return sum + count;
		}, 0);

		this.log("\n📈 Summary:");
		this.log("=".repeat(20));
		this.log(`   • Total Releases: ${totalReleases}`);
	}
}
