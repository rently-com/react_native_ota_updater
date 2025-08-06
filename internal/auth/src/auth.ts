/**
 * Authentication module integrating Next.js Auth with Drizzle ORM
 * @module Auth
 */

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { type NextAuthResult } from "next-auth";

import { account, db, session, user } from "@rentlydev/rnota-db";
import { authConfig } from "./auth.config";

/**
 * Drizzle adapter configuration for Next.js Auth
 * Maps authentication data to database tables using Drizzle ORM
 *
 * @const {ReturnType<typeof DrizzleAdapter>}
 */
const adapter = DrizzleAdapter(db, {
	usersTable: user,
	accountsTable: account,
	sessionsTable: session,
});

/**
 * Configured Next.js Auth instance with Drizzle adapter
 * Uses JWT strategy with 1-hour session duration
 *
 * @const {NextAuthResult}
 */
const nextAuth = NextAuth({
	adapter,
	session: {
		strategy: "jwt",
		maxAge: authConfig.jwt?.maxAge, // 1hr in seconds
	},
	...authConfig,
});

/**
 * Next.js API route handlers for authentication endpoints
 * @const {NextAuthResult["handlers"]}
 */
export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;

/**
 * Authentication function for protecting routes and getting session data
 * @const {NextAuthResult["auth"]}
 *
 * @example
 * ```typescript
 * // Protecting an API route
 * export async function GET(request: Request) {
 *   const session = await auth();
 *   if (!session) return new Response('Unauthorized', { status: 401 });
 *   // Handle authenticated request
 * }
 * ```
 */
export const auth: NextAuthResult["auth"] = nextAuth.auth;

/**
 * Next.js Auth instance without database adapter
 * Used for middleware authentication where database access isn't needed
 *
 * @const {NextAuthResult}
 */
const nextAuthWithOutAdapter = NextAuth(authConfig);

/**
 * Authentication middleware function
 * Lightweight version without database adapter for use in Edge runtime
 *
 * @const {NextAuthResult["auth"]}
 *
 * @example
 * ```typescript
 * // In middleware.ts
 * export async function middleware(request: Request) {
 *   const session = await authMiddleware();
 *   if (!session) return new Response('Unauthorized', { status: 401 });
 *   // Continue with authenticated request
 * }
 * ```
 */
export const authMiddleware: NextAuthResult["auth"] = nextAuthWithOutAdapter.auth;
