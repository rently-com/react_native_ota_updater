import { Suspense } from "react";

import { CollaboratorsTable } from "./_components/collaborators-table/collaborators-table";
import { CollaboratorsTableSkeleton } from "./_components/collaborators-table/collaborators-table-loading";

import AddNewCollaborator from "@/web/components/collaborators-page/add-collaborator/codepush";
import AddNewCollaboratorSkeleton from "@/web/components/collaborators-page/add-collaborator/loading";

export default async function AppCollaboratorsListPage() {
	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto p-8">
				<div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<h1 className="text-3xl font-bold">Collaborators</h1>

					<div className="flex flex-wrap items-center gap-4">
						<Suspense fallback={<AddNewCollaboratorSkeleton />}>
							<AddNewCollaborator />
						</Suspense>
					</div>
				</div>

				<Suspense fallback={<CollaboratorsTableSkeleton />}>
					<CollaboratorsTable />
				</Suspense>
			</div>
		</div>
	);
}
