/**
 * Pino Logger Middleware Module
 * Configures and provides Pino logging functionality for the API
 * @module PinoLogger
 */

import { pinoLogger as logger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";

import env from "@/api/env";

/**
 * Creates a configured Pino logger middleware instance
 * Provides request logging with unique request IDs and environment-specific formatting
 *
 * Features:
 * - Configurable log level via environment variables
 * - Pretty printing in development
 * - Standard JSON logging in production
 * - Unique request ID generation using crypto.randomUUID()
 * - Request/response logging
 *
 * Configuration:
 * - LOG_LEVEL: Set via environment (defaults to "info")
 * - Pretty printing: Enabled in non-production environments
 *
 * @returns {ReturnType<typeof logger>} Configured Pino logger middleware
 *
 * @example
 * ```typescript
 * import { pinoLogger } from './middlewares/pino-logger';
 *
 * // Add to application
 * app.use(pinoLogger());
 *
 * // Example development output:
 * // [12:00:00.000] INFO: GET /api/health 200 - 123ms
 * //   reqId: "550e8400-e29b-41d4-a716-446655440000"
 *
 * // Example production output (JSON):
 * // {"level":30,"time":1616161616,"reqId":"550e8400-e29b-41d4-a716-446655440000","method":"GET","url":"/api/health","status":200,"duration":123}
 * ```
 */
export const pinoLogger = () =>
	logger({
		pino: pino(
			{
				level: env.LOG_LEVEL || "info",
			},
			env.NODE_ENV === "production" ? undefined : pretty(),
		),
		http: {
			reqId: () => crypto.randomUUID(),
			responseTime: true,
		},
	});
