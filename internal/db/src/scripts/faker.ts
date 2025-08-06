/**
 * Test Data Generation Script
 * This module provides functions to generate realistic test data for all database entities.
 * It uses Faker.js to create randomized but consistent data for development and testing.
 */

import { faker } from "@faker-js/faker";

import {
	Permission,
	type Platform,
	ReleaseMethod,
	type TCodePushApp,
	type TCodePushAppWithPlatforms,
	type TCodePushDeployment,
	type TCodePushRelease,
	type TInsertAccessKey,
	type TInsertAccount,
	type TInsertCodePushApp,
	type TInsertCodePushCollaborator,
	type TInsertCodePushDeployment,
	type TInsertCodePushMetrics,
	type TInsertCodePushPlatform,
	type TInsertCodePushRelease,
	type TInsertUser,
	type TUser,
} from "../schema";
import { generateId, slugifyName } from "../schema/_table";

import seedData from "./data.json";

/**
 * Configuration Constants
 */
const CONFIG = {
	USERS: {
		COUNT: 10,
		ACCESS_KEYS_PER_USER: 10,
	},
	APPS: {
		COUNT: 5,
		RELEASES_PER_DEPLOYMENT: 10,
	},
	PLATFORMS: ["ios", "android"] as const,
	DEPLOYMENTS: ["Production", "Staging"] as const,
} as const;

/**
 * Date Generation Utilities
 */

/**
 * Generates a random date within the last 60 days
 * @returns {string} UTC date string
 */
const randomRecentPastDate = () => faker.date.recent({ days: 60 }).toUTCString();
/**
 * Generates a random date after a given date within 30 days
 * @param {string} from - Starting date
 * @returns {string} UTC date string
 */
const randomRecentPastDateAfter = (from: string) => faker.date.soon({ days: 30, refDate: from }).toUTCString();
/**
 * Generates a random date between a given date and specified days in the future
 * @param {string} from - Starting date
 * @param {number} days - Number of days range (default: 30)
 * @returns {string} UTC date string
 */
const randomDateBetween = (from: string, days = 30) => {
	const fromDate = new Date(from);
	const toDate = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
	return faker.date.between({ from: fromDate, to: toDate }).toUTCString();
};

/**
 * User Data Generation
 */

/**
 * Generates fake user data
 * Uses seed data if available, otherwise generates random users
 * @returns {TInsertUser[]} Array of user objects
 */
export function generateFakeUsers(): TInsertUser[] {
	const seedUsers = seedData?.users?.length > 0 ? seedData?.users : null;

	if (seedUsers) {
		return seedUsers.map((user) => {
			const createdAt = randomRecentPastDate();
			const updatedAt = randomRecentPastDateAfter(createdAt);

			return {
				...user,
				createdAt,
				updatedAt,
			};
		});
	}

	// Faker data
	return Array.from({ length: CONFIG.USERS.COUNT }, () => {
		const createdAt = randomRecentPastDate();
		const updatedAt = randomRecentPastDateAfter(createdAt);

		return {
			name: faker.person.fullName(),
			email: faker.internet.email(),
			image: faker.image.avatar(),
			emailVerified: faker.datatype.boolean() ? new Date(randomRecentPastDate()) : null,

			createdAt,
			updatedAt,
		};
	});
}

/**
 * Generates OAuth accounts for users
 * Creates GitHub OAuth accounts with random tokens and states
 * @param {TUser[]} users - Array of users to generate accounts for
 * @returns {TInsertAccount[]} Array of account objects
 */
export function generateFakeAccounts(users: TUser[]): TInsertAccount[] {
	return users.flatMap((user) => {
		return {
			userId: user.id,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,

			type: "oauth",
			provider: "github",
			providerAccountId: faker.number.int({ min: 1000000, max: 9999999 }).toString(),

			token_type: "Bearer",
			scope: "read:user,user:email",
			expires_at: null,

			refresh_token: faker.datatype.boolean() ? faker.string.alphanumeric(64) : null,
			access_token: faker.datatype.boolean() ? faker.string.alphanumeric(64) : null,
			id_token: faker.datatype.boolean() ? faker.string.alphanumeric(128) : null,
			session_state: faker.datatype.boolean() ? faker.string.alphanumeric(32) : null,
		};
	});
}

/**
 * Generates CLI access keys for users
 * Creates multiple access keys per user with varying expiration dates
 * @param {TUser[]} users - Array of users to generate keys for
 * @returns {TInsertAccessKey[]} Array of access key objects
 */
export function generateFakeAccessKeys(users: TUser[]): TInsertAccessKey[] {
	return users.flatMap((user): TInsertAccessKey[] => {
		const accessKeys = Array.from({ length: CONFIG.USERS.ACCESS_KEYS_PER_USER }, (): TInsertAccessKey => {
			const createdAt = randomRecentPastDate();
			const updatedAt = randomRecentPastDateAfter(createdAt);
			const expiresAt = randomDateBetween(createdAt);

			return {
				userId: user.id,
				name: faker.person.fullName(),
				createdBy: faker.internet.ipv4(),
				expiresAt,

				// @ts-expect-error
				createdAt,
				updatedAt,
			};
		});

		return accessKeys;
	});
}

/**
 * CodePush Application Data Generation
 */

/**
 * Generates CodePush applications
 * Uses seed data if available, otherwise generates random apps
 * @returns {TInsertCodePushApp[]} Array of application objects
 */
export function generateFakeApps(): TInsertCodePushApp[] {
	const seedApps = seedData?.apps?.length > 0 ? seedData.apps : null;

	if (seedApps) {
		return seedApps.map((app) => {
			// const createdAt = randomRecentPastDate();
			// const updatedAt = randomRecentPastDateAfter(createdAt);

			return {
				name: app.name,
				iconUrl: app.iconUrl,

				// createdAt,
				// updatedAt,
			};
		});
	}

	// Faker data
	return Array.from({ length: CONFIG.APPS.COUNT }, () => {
		const createdAt = randomRecentPastDate();
		const updatedAt = randomRecentPastDateAfter(createdAt);

		return {
			name: faker.commerce.productName(),

			createdAt,
			updatedAt,
		};
	});
}

/**
 * Generates app collaborator relationships
 * Ensures admin users have access to all apps and creates random collaborations
 * @param {TUser[]} users - All users
 * @param {TUser[]} adminUsers - Admin users
 * @param {TCodePushApp[]} apps - All applications
 * @returns {TInsertCodePushCollaborator[]} Array of collaborator objects
 */
export function generateFakeAppCollaborators(
	users: TUser[],
	adminUsers: TUser[],
	apps: TCodePushApp[],
): TInsertCodePushCollaborator[] {
	const collaborators: TInsertCodePushCollaborator[] = [];
	const usedCombinations = new Set<string>();

	// Add admin users to all apps first
	adminUsers.forEach((adminUser) => {
		apps.forEach((app) => {
			const combinationKey = `${adminUser.id}-${app.id}`;
			usedCombinations.add(combinationKey);
			collaborators.push({
				permission: Permission.ADMIN,
				userId: adminUser.id,
				appId: app.id,
			});
		});
	});

	const maxCount = users.length * apps.length;
	const numOfCollaboratorsToCreate = faker.number.int({ min: Math.max(users.length, apps.length), max: maxCount });

	while (collaborators.length < numOfCollaboratorsToCreate) {
		const user = faker.helpers.arrayElement(users);
		const app = faker.helpers.arrayElement(apps);

		const permission = faker.helpers.arrayElement([Permission.COLLABORATOR, Permission.OWNER]);
		const combinationKey = `${user.id}-${app.id}`;

		// Ensure no duplicate user for the same app
		if (!usedCombinations.has(combinationKey)) {
			usedCombinations.add(combinationKey);
			collaborators.push({
				permission,
				userId: user.id,
				appId: app.id,
			});
		}
	}

	return collaborators;
}

/**
 * Regenerates admin collaborator relationships
 * Ensures admin users have access to all applications
 * @param {TUser[]} adminUsers - Admin users
 * @param {TCodePushApp[]} apps - All applications
 * @returns {TInsertCodePushCollaborator[]} Array of admin collaborator objects
 */
export function reinsertAdminAppCollaborators(
	adminUsers: TUser[],
	apps: TCodePushApp[],
): TInsertCodePushCollaborator[] {
	const collaborators: TInsertCodePushCollaborator[] = [];
	const usedCombinations = new Set<string>();

	// Add admin users to all apps first
	adminUsers.forEach((adminUser) => {
		apps.forEach((app) => {
			const combinationKey = `${adminUser.id}-${app.id}`;
			usedCombinations.add(combinationKey);
			collaborators.push({
				permission: Permission.ADMIN,
				userId: adminUser.id,
				appId: app.id,
			});
		});
	});

	return collaborators;
}

/**
 * Platform Configuration Generation
 */

/**
 * Generates platform configurations for apps
 * Creates iOS and Android platforms for each app
 * @param {TCodePushApp[]} apps - All applications
 * @returns {TInsertCodePushPlatform[]} Array of platform objects
 */
export function generatePlatforms(apps: TCodePushApp[]): TInsertCodePushPlatform[] {
	return apps.flatMap((app) =>
		CONFIG.PLATFORMS.map((platformName) => ({
			name: platformName as Platform,
			appId: app.id,
		})),
	);
}

/**
 * Deployment Configuration Generation
 */

/**
 * Generates deployment configurations for platforms
 * Creates Production and Staging deployments for each platform
 * @param {TCodePushAppWithPlatforms[]} apps - Applications with platform info
 * @returns {TInsertCodePushDeployment[]} Array of deployment objects
 */
export function generateDeployments(apps: TCodePushAppWithPlatforms[]): TInsertCodePushDeployment[] {
	return apps.flatMap((app) => {
		// const createdAt = randomRecentPastDate();
		// const updatedAt = randomRecentPastDateAfter(createdAt);

		return app.platforms.flatMap((platform) =>
			CONFIG.DEPLOYMENTS.map((deploymentName) => {
				const appName = slugifyName(app.name);
				const platformName = slugifyName(platform.name);
				const deploymentNameSlug = slugifyName(deploymentName);
				// @ts-expect-error
				const seedDataDeployments = seedData.deployments?.[app.name]?.[platform.name]?.[deploymentName];

				let key = "";

				if (seedDataDeployments) {
					key = seedDataDeployments.key;
				} else {
					key = `${appName}_${platformName}_${deploymentNameSlug}_${generateId(12)}`;
				}

				return {
					key,
					name: deploymentName,
					appId: app.id,
					platformId: platform.id,

					// createdAt,
					// updatedAt,
				};
			}),
		);
	});
}

/**
 * Release and Metrics Generation
 */

/**
 * Generates release data for deployments
 * Creates multiple releases with varying states and metadata
 * @param {TCodePushDeployment[]} deployments - All deployments
 * @param {TUser[]} users - All users
 * @param {number} count - Number of releases per deployment
 * @returns {TInsertCodePushRelease[]} Array of release objects
 */
export function generateFakeReleases(
	deployments: TCodePushDeployment[],
	users: TUser[],
	count = CONFIG.APPS.RELEASES_PER_DEPLOYMENT,
): TInsertCodePushRelease[] {
	return deployments.flatMap((deployment): TInsertCodePushRelease[] => {
		let index = 1;
		const releases = Array.from({ length: count }, (): TInsertCodePushRelease => {
			const user = faker.helpers.arrayElement(users);

			const createdAt = randomRecentPastDate();
			const updatedAt = randomRecentPastDateAfter(createdAt);

			let rollout: TCodePushRelease["rollout"] = faker.number.int({ min: 0, max: 100 });
			if (rollout >= 85) {
				rollout = null;
			}

			const label = `v${index}`;

			index++;

			return {
				createdAt,
				updatedAt,

				packageHash: faker.string.alphanumeric(64),

				description: faker.datatype.boolean() ? faker.lorem.sentence() : null,

				isDisabled: faker.datatype.boolean(),
				isMandatory: faker.datatype.boolean(),
				releaseMethod: faker.helpers.arrayElement([
					ReleaseMethod.UPLOAD,
					ReleaseMethod.PROMOTE,
					ReleaseMethod.ROLLBACK,
				]),

				size: faker.number.int({ min: 1000000, max: 100000000 }),
				blobId: generateId(),
				isVerified: faker.datatype.boolean(),

				rollout: rollout,
				label: label,
				appVersion: faker.system.semver(),

				originalLabel: faker.system.semver(),
				originalDeploymentName: deployment.name,

				deploymentId: deployment.key,
				releasedByUserId: user.id,
			};
		});

		return releases;
	});
}

/**
 * Generates metrics data for releases
 * Creates usage statistics for each release
 * @param {TCodePushRelease[]} releases - All releases
 * @returns {TInsertCodePushMetrics[]} Array of metrics objects
 */
export function generateFakeMetrics(releases: TCodePushRelease[]): TInsertCodePushMetrics[] {
	return releases.map((release): TInsertCodePushMetrics => {
		const createdAt = release.createdAt;
		const updatedAt = randomRecentPastDateAfter(createdAt);

		return {
			createdAt,
			updatedAt,

			releaseId: release.id,
			activeCount: faker.number.int({ min: 0, max: 100000 }),
			downloadedCount: faker.number.int({ min: 0, max: 100000 }),
			installedCount: faker.number.int({ min: 0, max: 100000 }),
			failedCount: faker.number.int({ min: 0, max: 100000 }),
		};
	});
}
