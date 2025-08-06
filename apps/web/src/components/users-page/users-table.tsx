"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";
import { getAllUsersQueryOptions } from "@/web/lib/client/common-queries";
import { useSuspenseQuery } from "@tanstack/react-query";

import { UserRow } from "./user-row";

export default function UsersTable() {
	const { data: users } = useSuspenseQuery(getAllUsersQueryOptions());

	return (
		<div className="space-y-4">
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Joined</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{users.map((user) => (
							<UserRow key={user.id} user={user} />
						))}

						{users.length === 0 && (
							<TableRow>
								<TableCell colSpan={4} className="h-24 text-center">
									No users found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
