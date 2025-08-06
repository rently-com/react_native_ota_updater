import { Skeleton } from "@/web/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";

export function ReleaseHistorySkeleton() {
	return (
		<div className="rounded-md border w-full">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/50">
						<TableHead>Release</TableHead>
						<TableHead>Target Version</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Mandatory</TableHead>
						<TableHead>Rollbacks</TableHead>
						<TableHead>Active Devices</TableHead>
						<TableHead>Date</TableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{Array.from({ length: 5 }).map((_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<TableRow key={index} className="cursor-pointer hover:bg-muted/50">
							<TableCell>
								<div className="flex items-center gap-2">
									<Skeleton className="h-8 w-8 rounded-full" />
									<div className="flex flex-col gap-1">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-3 w-32" />
									</div>
								</div>
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-16 font-mono" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-5 w-16 rounded-full" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-8" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-8 font-mono" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-12 font-mono" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-24" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
