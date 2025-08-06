import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	transpilePackages: [
		"@rentlydev/rnota-api",
		"@rentlydev/rnota-db",
		"@rentlydev/rnota-aws",
		"@rentlydev/rnota-redis",
		"@rentlydev/rnota-api-client",
	],
	output: "standalone",
	outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
