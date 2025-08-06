"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format, isAfter } from "date-fns";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/web/components/ui/button";
import { getAccessKeysQueryOptions, useDeleteAccessKeyMutation } from "@/web/lib/client/common-queries";
import { cn } from "@/web/lib/utils";

export function AccessKeysList() {
	const { data: accessKeys } = useSuspenseQuery(getAccessKeysQueryOptions());
	const deleteAccessKeyMutation = useDeleteAccessKeyMutation();

	const handleDeleteKey = (name: string) => {
		deleteAccessKeyMutation.mutate({ name });
	};

	const handleCopyKey = (token: string) => {
		navigator.clipboard.writeText(token);
		toast.success("Access key copied to clipboard");
	};

	if (!accessKeys?.length) {
		return <div className="text-center text-muted-foreground">No access keys found</div>;
	}

	return (
		<div className="space-y-4">
			{accessKeys.map((key) => {
				const isExpired = isAfter(new Date(), new Date(key.expiresAt));

				return (
					<div
						key={key.token}
						className={cn("flex items-center justify-between rounded-lg border p-4", {
							"bg-red-500/5": isExpired,
						})}
					>
						<div>
							<div className="font-medium">{key.name}</div>
							<div className="text-sm text-muted-foreground">
								Created by {key.createdBy} on {format(new Date(key.createdAt), "MMM d, yyyy, h:mm:ss a")}
							</div>
							<div className="text-sm text-muted-foreground">
								Expires on {format(new Date(key.expiresAt), "MMM d, yyyy, h:mm:ss a")}
							</div>
						</div>

						<div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleCopyKey(key.token)}
								disabled={deleteAccessKeyMutation.isPending}
							>
								<Copy className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleDeleteKey(key.name)}
								disabled={deleteAccessKeyMutation.isPending}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
