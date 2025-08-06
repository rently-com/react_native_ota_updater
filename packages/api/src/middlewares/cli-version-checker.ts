/**
 * CLI Version Checker Middleware
 *
 * Ensures that requests from the CLI are not allowed if the server version is greater than the CLI version provided in the headers.
 *
 * Features:
 * - Extracts CLI version from the X-CodePush-CLI-Version header
 * - Compares CLI version with the server version (from package.json)
 * - If the server version is greater, responds with 426 Upgrade Required and a message prompting the user to update their CLI
 * - Skips the check if the CLI version is missing or unknown
 *
 * Usage:
 * ```typescript
 * import { cliVersionChecker } from './middlewares/cli-version-checker';
 * app.use('/codepush/*', cliVersionChecker);
 * ```
 *
 * @throws {Response} 426 Upgrade Required - If the CLI version is less than the server version
 */
import { createFactoryMiddleware } from "@/api/lib/create/router";
import * as semver from "semver";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { getCliVersion } from "@/api/utils/codepush/rest-headers";
import { STRINGS } from "@/api/utils/strings";

import pkgJson from "../../package.json";

const serverVersion = pkgJson.version;

export const cliVersionChecker = createFactoryMiddleware(async (c, next) => {
	// Get the CLI version from the request headers if it exists
	const cliVersion = getCliVersion(c.req);

	// If the CLI version is not provided (or unknown), skip checking
	if (!cliVersion || cliVersion === "Unknown") {
		return next();
	}

	// If the CLI version is valid and the server version is valid, and the CLI version is less than the server version, return an upgrade required error
	if (semver.valid(cliVersion) && semver.valid(serverVersion) && semver.gt(serverVersion, cliVersion)) {
		return c.text(
			STRINGS.CLI_VERSION_CHECKER.UPGRADE_REQUIRED(cliVersion, serverVersion),
			HttpStatusCodes.UPGRADE_REQUIRED,
		);
	}

	// If the CLI version is valid and the server version is valid, and the CLI version is greater than or equal to the server version, continue
	return next();
});
