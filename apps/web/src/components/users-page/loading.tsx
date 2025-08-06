import { Skeleton } from "@/web/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";

export default function UsersTableLoading() {
	return (
		<div className="space-y-4">
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								<Skeleton className="h-4 w-[70px]" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-[100px]" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-[50px]" />
							</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{Array.from({ length: 5 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<TableRow key={i}>
								<TableCell className="font-medium">
									<div className="flex items-center space-x-2">
										<Skeleton className="h-8 w-8 rounded-full" />
										<Skeleton className="h-4 w-[100px]" />
									</div>
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-[120px]" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-[80px]" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
