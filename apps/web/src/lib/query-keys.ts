interface CliToken {
	hostname: string;
}

interface Collaborators {
	appName: string;
}

interface Overview extends Collaborators {}
interface Deployments extends Collaborators {}
interface History extends Collaborators {
	platform: string;
	deploymentName: string;
}
interface Release extends History {
	label: string;
}

export const queryKeys = {
	cliToken: ({ hostname }: CliToken) => ["cli-token", hostname],
	users: ["users"],
	accessKeys: ["accessKeys"],

	codepush: {
		appsList: ["codepush-apps"],
		overview: ({ appName }: Overview) => ["codepush-app-overview", appName],
		collaborators: ({ appName }: Collaborators) => ["codepush-app-collaborators", appName],
		deployments: ({ appName }: Deployments) => ["codepush-app-deployments", appName],
		history: ({ appName, platform, deploymentName }: History) => [
			"codepush-app-deployment-history",
			appName,
			platform,
			deploymentName,
		],
		release: ({ appName, platform, deploymentName, label }: Release) => [
			"codepush-app-release",
			appName,
			platform,
			deploymentName,
			label,
		],
		releaseDownloadUrl: ({ blobId }: { blobId: string }) => ["codepush-release-download-url", blobId],
	},
};
