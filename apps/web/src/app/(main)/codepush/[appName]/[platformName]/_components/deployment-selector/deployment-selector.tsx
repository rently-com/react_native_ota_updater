"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/web/components/ui/select";
import { getPlatformDeploymentsQueryOptions } from "@/web/lib/client/codepush-queries";
import { searchParams } from "@/web/lib/searchParams";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useEffect } from "react";

export function DeploymentSelector() {
	const [{ deployment }, setParams] = useQueryStates(searchParams);

	useEffect(() => {
		setParams({ deployment });
	}, [deployment]);

	const { data: platformDeployments } = useSuspenseQuery(getPlatformDeploymentsQueryOptions());

	const handleDeploymentChange = (value: string) => setParams({ deployment: value });

	return (
		<div className="mb-6">
			<Select onValueChange={handleDeploymentChange} defaultValue={deployment}>
				<SelectTrigger className="w-[200px]">
					<SelectValue placeholder="Select deployment" />
				</SelectTrigger>

				<SelectContent>
					{platformDeployments?.map((platformDeployment) => (
						<SelectItem key={platformDeployment.key} value={platformDeployment.name}>
							{platformDeployment.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
