import { Suspense } from "react";
import { DeploymentKey } from "../_components/deployment-key";
import { DeploymentSelector } from "./_components/deployment-selector/deployment-selector";
import { DeploymentSelectorSkeleton } from "./_components/deployment-selector/deployment-selector-loading";
import { ReleaseHistoryList } from "./_components/release-table/release-history-list";
import { ReleaseHistorySkeleton } from "./_components/release-table/release-history-loading";

export default async function PlatformDeploymentPage() {
	return (
		<>
			<div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Deployments</h1>
				<div className="flex flex-wrap items-center gap-4">
					<Suspense fallback={<DeploymentSelectorSkeleton />}>
						<DeploymentSelector />
					</Suspense>
				</div>
			</div>

			<div className="mb-8 grid gap-4 md:grid-cols-2">
				<div>
					<h2 className="text-lg font-semibold mb-2">Deployment Key</h2>
					<Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded" />}>
						<DeploymentKey />
					</Suspense>
				</div>
			</div>

			<Suspense fallback={<ReleaseHistorySkeleton />}>
				<ReleaseHistoryList />
			</Suspense>
		</>
	);
}
