import { SheetHeader } from "@/web/components/ui/sheet";
import { Skeleton } from "@/web/components/ui/skeleton";

export function ReleaseDetailsSkeleton() {
	return (
		<div className="space-y-8">
			<SheetHeader className="flex-row justify-between items-center space-x-2 my-6">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-32" />
			</SheetHeader>
			<div className="grid grid-cols-2 gap-8">
				<div className="flex flex-col items-center">
					<Skeleton className="h-[140px] w-[140px] rounded-full" />
					<div className="mt-4 text-center">
						<Skeleton className="h-4 w-20 mx-auto mb-2" />
						<Skeleton className="h-8 w-16 mx-auto" />
					</div>
				</div>
				<div className="flex flex-col items-center">
					<Skeleton className="h-[140px] w-[140px] rounded-full" />
					<div className="mt-4 grid grid-cols-2 gap-8 text-center w-full">
						<div>
							<Skeleton className="h-4 w-16 mx-auto mb-2" />
							<Skeleton className="h-8 w-20 mx-auto" />
						</div>
						<div>
							<Skeleton className="h-4 w-20 mx-auto mb-2" />
							<Skeleton className="h-8 w-20 mx-auto" />
						</div>
					</div>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-x-8 gap-y-4">
				{Array.from({ length: 8 }).map((_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
					<div key={index}>
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-6 w-32" />
					</div>
				))}
			</div>
			<div className="space-y-4">
				<div>
					<Skeleton className="h-4 w-24 mb-2" />
					<Skeleton className="h-6 w-48" />
				</div>
				<div>
					<Skeleton className="h-4 w-24 mb-2" />
					<div className="flex items-center space-x-2 mt-1">
						<Skeleton className="h-6 w-6 rounded-full" />
						<Skeleton className="h-6 w-32" />
					</div>
				</div>
			</div>
			<div>
				<Skeleton className="h-4 w-24 mb-2" />
				<Skeleton className="h-20 w-full" />
			</div>
		</div>
	);
}
