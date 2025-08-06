import { Suspense } from "react";

import AddNewCodePushApp from "@/web/components/apps-page/add-app/codepush";
import AppsFilter from "@/web/components/apps-page/apps-filter";
import CodePushAppsListTable from "@/web/components/apps-page/list/codepush";
import AppsListLoading from "@/web/components/apps-page/list/loading";
import RoleSelector from "@/web/components/apps-page/role-selector";

export default async function CodePushAppsPage() {
	return (
		<>
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-2xl font-semibold">CodePush Apps</h1>

				<div className="flex items-center gap-4">
					<AppsFilter />

					<RoleSelector />

					<AddNewCodePushApp />
				</div>
			</div>

			<Suspense fallback={<AppsListLoading />}>
				<CodePushAppsListTable />
			</Suspense>
		</>
	);
}
