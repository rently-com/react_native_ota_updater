import { Suspense } from "react";
import AddNewDeployment from "./_components/add-new-deployment";
import AppHeader from "./_components/app-name-header/app-name-header";
import AppHeaderSkeleton from "./_components/app-name-header/app-name-header-loading";
import { Endpoint } from "./_components/endpoint";
import PlatformsList from "./_components/platforms-list/platforms-list";
import PlatformsListSkeleton from "./_components/platforms-list/platforms-list-loading";
import ViewCollaborators from "./_components/view-collaborators";

import ViewDeploymentKeys from "@/web/components/apps-page/list-keys";

export default async function AppDetailsPage() {
	return (
		<>
			<div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<Suspense fallback={<AppHeaderSkeleton />}>
					<AppHeader />
				</Suspense>

				<div className="flex flex-wrap items-center gap-4">
					<ViewCollaborators />
					<ViewDeploymentKeys />
					<AddNewDeployment />
				</div>
			</div>

			<div className="mb-8 grid gap-4 md:grid-cols-2">
				<div>
					<h2 className="text-lg font-semibold mb-2">Endpoint</h2>
					<Endpoint />
				</div>
			</div>

			<Suspense fallback={<PlatformsListSkeleton />}>
				<PlatformsList />
			</Suspense>
		</>
	);
}
