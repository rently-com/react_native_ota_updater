import { Skeleton } from "@/web/components/ui/skeleton";

export function UserSelectorLoading() {
	return (
		<div className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
			<div className="flex items-center gap-2">
				<div className="flex flex-col gap-1">
					<Skeleton className="h-4 w-24" />
				</div>
			</div>

			<Skeleton className="h-4 w-4" />
		</div>
	);
}
