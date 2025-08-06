import { Select, SelectTrigger, SelectValue } from "@/web/components/ui/select";

export function DeploymentSelectorSkeleton() {
	return (
		<div className="mb-6">
			<Select disabled>
				<SelectTrigger className="w-[200px]">
					<SelectValue placeholder="Loading deployments..." />
				</SelectTrigger>
			</Select>
		</div>
	);
}
