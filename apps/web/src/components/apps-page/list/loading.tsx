import { Skeleton } from "@/web/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";

export default function AppsListLoading() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Role</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{Array.from({ length: 10 }).map((_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
					<TableRow key={index}>
						<TableCell>
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded bg-muted" />
								<Skeleton className="w-20 h-4" />
							</div>
						</TableCell>

						<TableCell>
							<Skeleton className="w-20 h-4" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
