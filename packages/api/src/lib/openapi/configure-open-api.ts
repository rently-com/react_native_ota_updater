/**
 * OpenAPI Configuration Module
 * Sets up OpenAPI/Swagger documentation and API reference UI
 * @module OpenAPIConfig
 */

import { apiReference } from "@scalar/hono-api-reference";

import { BASE_API_PATH } from "@/api/lib/constants";
import type { AppOpenAPI } from "@/api/lib/types";

import pkgJson from "../../../package.json";

/**
 * Configures OpenAPI documentation and API reference for the application
 * Sets up documentation endpoints and security schemes
 *
 * Features:
 * - Bearer token authentication scheme
 * - OpenAPI specification endpoint (`${BASE_PATH}/doc`)
 * - Interactive API reference UI (`${BASE_PATH}/reference`)
 * - Customized Scalar API reference configuration
 *
 * @param {AppOpenAPI} app - The Hono application instance to configure
 *
 * @example
 * ```typescript
 * const app = createApp();
 * configureOpenAPI(app);
 *
 * // Access documentation:
 * // - OpenAPI spec: http://localhost:3000/api/doc
 * // - API reference: http://localhost:3000/api/reference
 * ```
 */
export default function configureOpenAPI(app: AppOpenAPI) {
	// Register Bearer authentication scheme
	app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
		type: "http",
		scheme: "bearer",
	});

	// Configure OpenAPI specification
	app.doc("/doc", {
		openapi: "3.0.0",
		info: {
			version: pkgJson.version,
			title: "React Native OTA Updater Open API",
		},
	});

	// Set up interactive API reference UI
	app.get(
		"/reference",
		apiReference({
			// UI Configuration
			pageTitle: "React Native Updater Open API Reference",
			spec: {
				url: `${BASE_API_PATH}/doc`,
			},
			theme: "kepler",
			layout: "classic",
			darkMode: true,

			// Display Configuration
			hideModels: true,
			hideDownloadButton: true,

			// HTTP Client Configuration
			defaultHttpClient: {
				targetKey: "js",
				clientKey: "fetch",
			},

			// Hide unnecessary HTTP clients
			hiddenClients: [
				"ofetch",
				"http",
				"libcurl",
				"clj_http",
				"httpclient",
				"restsharp",
				"native",
				"http1.1",
				"asynchttp",
				"nethttp",
				"okhttp",
				"unirest",
				"xhr",
				"jquery",
				"okhttp",
				"native",
				"request",
				"unirest",
				"nsurlsession",
				"cohttp",
				"curl",
				"guzzle",
				"http1",
				"http2",
				"webrequest",
				"restmethod",
				"python3",
				"requests",
				"httr",
				"native",
				"curl",
				"httpie",
				"wget",
				"nsurlsession",
				"undici",
			],
		}),
	);
}
