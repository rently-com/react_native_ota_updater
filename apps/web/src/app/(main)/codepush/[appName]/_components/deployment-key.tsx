"use client";

import { Button } from "@/web/components/ui/button";
import { Input } from "@/web/components/ui/input";
import { getPlatformDeploymentsQueryOptions } from "@/web/lib/client/codepush-queries";
import { searchParams } from "@/web/lib/searchParams";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

export function DeploymentKey() {
	const [isCopied, setIsCopied] = useState(false);

	const [{ deployment }] = useQueryStates(searchParams);

	const { data: platformDeployments } = useSuspenseQuery(getPlatformDeploymentsQueryOptions());

	const deploymentKey =
		platformDeployments?.find((platformDeployment) => platformDeployment.name === deployment)?.key ?? "";

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(deploymentKey);
			setIsCopied(true);
			toast.info("Deployment key copied to clipboard");
			setTimeout(() => setIsCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
			toast.error("Failed to copy deployment key");
		}
	};

	return (
		<div className="flex w-full max-w-sm items-center space-x-2">
			<Input type="text" value={deploymentKey} readOnly className="font-mono" />
			<Button type="button" size="icon" onClick={copyToClipboard} variant={isCopied ? "outline" : "default"}>
				<Copy className="h-4 w-4" />
			</Button>
		</div>
	);
}
