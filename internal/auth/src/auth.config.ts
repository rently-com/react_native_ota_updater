/**
 * Authentication configuration module for Next.js Auth
 * @module AuthConfig
 */

import GitHub from "@auth/core/providers/github";
import type { NextAuthConfig } from "next-auth";

import { ADMIN_USER_EMAILS, Permission, codepush_collaborator, db } from "@rentlydev/rnota-db";

import env from "./env";

/**
 * Maximum age of the JWT token in seconds (1 hour)
 * @constant {number}
 */
const JWT_MAX_AGE = 60 * 60; // 1hr in seconds

/**
 * Grants admin access to all codepush apps for admin users
 *
 * @param {string} userId - The user ID to grant access to
 * @param {string} email - The user's email address
 * @returns {Promise<void>}
 */
async function grantAdminAccessToAllApps(userId: string, email: string): Promise<void> {
	// Skip if not an admin email
	if (!email || !ADMIN_USER_EMAILS.includes(email as (typeof ADMIN_USER_EMAILS)[number])) return;

	console.log(`👑 Admin user detected: ${email}`);

	// Get all codepush apps
	const codepushApps = await db.query.codepush_app.findMany();
	console.log(`📱 Found ${codepushApps.length} apps to grant admin access`);

	// Create admin collaborator records for all apps
	await db
		.insert(codepush_collaborator)
		.values(
			codepushApps.map((app) => ({
				userId,
				appId: app.id,
				permission: Permission.ADMIN,
			})),
		)
		.onConflictDoNothing();

	console.log(`✨ Admin user ${email} granted access to all codepush apps`);
}

/**
 * Next.js Auth configuration object
 * Configures GitHub authentication, JWT settings, custom pages, and authentication callbacks
 *
 * @type {NextAuthConfig}
 *
 * Features:
 * - GitHub OAuth provider integration
 * - Custom JWT expiration (1 hour)
 * - Custom login page routing
 * - Domain-based access control (optional)
 * - Session user ID synchronization
 *
 * @example
 * ```typescript
 * // Usage in Next.js app configuration
 * import { authConfig } from './auth.config';
 * import NextAuth from 'next-auth';
 *
 * export const { auth, signIn, signOut } = NextAuth(authConfig);
 * ```
 */
export const authConfig: NextAuthConfig = {
	secret: env.AUTH_SECRET,
	providers: [
		GitHub({
			clientId: env.AUTH_GITHUB_ID,
			clientSecret: env.AUTH_GITHUB_SECRET,
		}),
	],
	jwt: {
		maxAge: JWT_MAX_AGE,
	},
	pages: {
		signIn: "/login",
	},
	callbacks: {
		/**
		 * Callback to synchronize session data with token information
		 * Ensures the user ID from the token is available in the session
		 *
		 * @param {object} params - Callback parameters
		 * @param {any} params.session - Current session object
		 * @param {any} params.token - JWT token object
		 * @returns {any} Modified session object with user ID
		 */
		session({ session, token }) {
			session.user.id = token.sub!;
			return session;
		},

		/**
		 * Authorization callback to check if the user is authenticated
		 *
		 * @param {object} params - Callback parameters
		 * @param {any} params.auth - Authentication object
		 * @returns {Promise<boolean>} True if user is authenticated, false otherwise
		 */
		authorized: async ({ auth }) => {
			// Logged in users are authenticated, otherwise redirect to login page
			return !!auth;
		},

		/**
		 * Sign-in callback for domain-based access control
		 * If AUTH_ALLOWED_DOMAIN is set, only allows users with matching email domains
		 *
		 * @param {object} params - Callback parameters
		 * @param {any} params.user - User object from the authentication provider
		 * @returns {Promise<boolean>} True if sign-in is allowed, false otherwise
		 *
		 * @example
		 * ```typescript
		 * // With domain restriction
		 * AUTH_ALLOWED_DOMAIN="@company.com"
		 * // Only allows emails like: user@company.com
		 * ```
		 */
		signIn: async ({ user }) => {
			if (!env.AUTH_ALLOWED_DOMAIN) return true;

			if (user.email?.endsWith(env.AUTH_ALLOWED_DOMAIN)) {
				return true;
			}

			return false;
		},
	},
	events: {
		createUser: async ({ user }) => {
			const { email, id } = user;
			
			if (id) {
				await grantAdminAccessToAllApps(id, email || "");
			}
		},
		signIn: async ({ user }) => {
			const { email, id } = user;

			// Grant admin access if user is admin
			if (id) {
				await grantAdminAccessToAllApps(id, email || "");
			}
		},
	},
} as const;
