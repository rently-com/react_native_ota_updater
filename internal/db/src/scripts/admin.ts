/**
 * Admin User Management Script
 * This script manages admin user access by ensuring that predefined admin users
 * have the necessary permissions for all CodePush applications in the system.
 */

import { inArray } from "drizzle-orm";

import { db } from "../client";
import * as schema from "../schema";
import { ADMIN_USER_EMAILS } from "../schema/_table";
import * as seedData from "./faker";

/**
 * Main admin management function
 * Performs the following tasks:
 * 1. Identifies admin users based on predefined email addresses
 * 2. Retrieves all CodePush applications
 * 3. Ensures admin users have collaborator access to all apps
 * @returns {Promise<void>}
 */
async function admin() {
	try {
		// Step 1: Fetch Admin Users
		const adminUsers = await db.query.user.findMany({
			where: inArray(schema.user.email, [...ADMIN_USER_EMAILS]),
		});
		console.log(`📊 Found ${adminUsers.length} admin users`);

		// Step 2: Fetch All Apps
		const codepushApps = await db.query.codepush_app.findMany();
		console.log(`📱 Found ${codepushApps.length} CodePush applications`);

		// Step 3: Ensure Admin Access
		await db
			.insert(schema.codepush_collaborator)
			.values(seedData.reinsertAdminAppCollaborators(adminUsers, codepushApps))
			.onConflictDoNothing();

		console.log("✅ Admin permissions updated successfully");
	} catch (error) {
		console.error("❌ Error updating admin permissions:", error);
		throw error;
	}
}

// Execute the admin management script
admin()
	.then(() => {
		console.log("✨ Admin management completed successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("❌ Admin management failed:", error);
		process.exit(1);
	});
