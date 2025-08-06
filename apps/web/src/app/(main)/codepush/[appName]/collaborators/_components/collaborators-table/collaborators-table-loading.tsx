import { Skeleton } from "@/web/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";

export function CollaboratorsTableSkeleton() {
	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>User</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Permission</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 10 }).map((_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<TableRow key={index}>
							{/* User column with avatar and name skeletons */}
							<TableCell className="font-medium">
								<div className="flex items-center space-x-3">
									<Skeleton className="h-10 w-10 rounded-full" />
									<Skeleton className="h-4 w-24" />
								</div>
							</TableCell>
							{/* Email skeleton */}
							<TableCell>
								<Skeleton className="h-4 w-40" />
							</TableCell>
							{/* Permission skeleton */}
							<TableCell className="w-[200px]">
								<Skeleton className="h-4 w-24" />
							</TableCell>
							{/* Actions skeleton */}
							<TableCell>
								<div className="flex space-x-2">
									<Skeleton className="h-8 w-8 rounded-full" />
									<Skeleton className="h-8 w-8 rounded-full" />
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}
