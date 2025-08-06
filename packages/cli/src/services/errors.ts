/**
 * Error handling utilities for the React Native OTA Updater CLI.
 * Provides standardized error handling and custom error types.
 *
 * Features:
 * - Custom API error type
 * - Standardized error handling
 * - Automatic credential clearing on auth errors
 * - Error message extraction from responses
 *
 * @module errors
 */

import { CLIError } from "@oclif/core/errors";
import type { ClientResponse } from "hono/client";
import { StatusCodes } from "http-status-codes";

import { credentialsVault } from "./credentials-vault.js";

/**
 * Custom error class for API-related errors
 * Used to distinguish API errors from other error types
 *
 * @example
 * ```typescript
 * throw new APIError("Invalid access token");
 * ```
 */
export class APIError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "APIError";
	}
}

/**
 * Extracts a human-readable error message from an API response
 * Handles various response formats and attempts to find the most relevant message
 *
 * @param {unknown} response - The raw API response to parse
 * @returns {string | undefined} The extracted error message or undefined if none found
 *
 * @example
 * ```typescript
 * const message = getCommonAPIErrorMessage(response);
 * if (message) {
 *   console.error(`API Error: ${message}`);
 * }
 * ```
 */
const getCommonAPIErrorMessage = (response: unknown): string | undefined => {
	try {
		if (typeof response === "string") {
			return response;
		}

		const responseMessage = JSON.parse(response as string);

		if (responseMessage?.message) {
			return responseMessage?.message as string;
		}
	} catch {
		return undefined;
	}
};

/**
 * Handles API errors in a standardized way
 * Processes error responses and throws appropriate errors
 *
 * Features:
 * - Automatic handling of common HTTP status codes
 * - Credential clearing on authentication errors
 * - Extraction of error messages from responses
 * - Fallback error messages for unknown errors
 *
 * @param {ClientResponse<unknown>} errorResponse - The error response from the API
 * @returns {Promise<never>} Never returns, always throws an error
 * @throws {CLIError} For internal server errors or unknown errors
 * @throws {APIError} For known API errors with messages
 *
 * @example
 * ```typescript
 * try {
 *   const response = await api.someEndpoint();
 *   if (!response.ok) {
 *     await handleError(response);
 *   }
 * } catch (error) {
 *   console.error("API call failed:", error.message);
 * }
 * ```
 */
export async function handleError(errorResponse: ClientResponse<unknown>): Promise<never> {
	const errorStatus = errorResponse.status;

	const errorResponseMessage = await errorResponse.text();
	const errorMessage = getCommonAPIErrorMessage(errorResponseMessage);

	if (errorStatus === StatusCodes.INTERNAL_SERVER_ERROR) {
		throw new CLIError("An internal server error occurred. Please retry your request.");
	}

	if (errorStatus === StatusCodes.UNAUTHORIZED) {
		credentialsVault.clear();
	}

	if (errorMessage) {
		throw new APIError(errorMessage);
	}

	throw new CLIError("An error occurred while processing your request.");
}
