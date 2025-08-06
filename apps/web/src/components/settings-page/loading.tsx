import { Skeleton } from "@/web/components/ui/skeleton";

export function AccessKeysListSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div>
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-48 mb-1" />
					<Skeleton className="h-4 w-40" />
				</div>

				<div className="flex items-center gap-2">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</div>
		</div>
	);
}
