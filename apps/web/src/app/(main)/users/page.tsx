import { Suspense } from "react";

import UsersTableLoading from "@/web/components/users-page/loading";
import UsersTable from "@/web/components/users-page/users-table";

export default function UsersPage() {
	return (
		<>
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Users</h1>
			</div>

			<Suspense fallback={<UsersTableLoading />}>
				<UsersTable />
			</Suspense>
		</>
	);
}
