"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/web/components/ui/button";
import { Input } from "@/web/components/ui/input";
import { Label } from "@/web/components/ui/label";
import { useAddAccessKeyMutation } from "@/web/lib/client/common-queries";

export function AccessKeysForm() {
	const [newKeyName, setNewKeyName] = useState("");
	const [newKeyTtl, setNewKeyTtl] = useState<number | undefined>();

	const addAccessKeyMutation = useAddAccessKeyMutation();

	const handleCreateKey = () => {
		if (!newKeyName.trim()) {
			toast.error("Please enter a name for the access key");
			return;
		}

		addAccessKeyMutation.mutate(
			{
				name: newKeyName.trim(),
				ttl: newKeyTtl,
			},
			{
				onSuccess: () => {
					setNewKeyName("");
					setNewKeyTtl(undefined);
				},
			},
		);
	};

	return (
		<div className="mb-6 space-y-4">
			<div className="flex items-end gap-4">
				<div className="flex-1 space-y-2">
					<Label htmlFor="keyName">Key Name</Label>
					<Input
						id="keyName"
						placeholder="e.g., Production Server"
						value={newKeyName}
						onChange={(e) => setNewKeyName(e.target.value)}
					/>
				</div>
				<div className="flex-1 space-y-2">
					<Label htmlFor="keyTtl">Time to Live (seconds)</Label>
					<Input
						id="keyTtl"
						type="number"
						placeholder="Optional"
						value={newKeyTtl || ""}
						onChange={(e) =>
							setNewKeyTtl(
								e.target.value ? (Number(e.target.value) > 0 ? Number(e.target.value) : undefined) : undefined,
							)
						}
					/>
				</div>
				<Button onClick={handleCreateKey} disabled={addAccessKeyMutation.isPending}>
					<Plus className="mr-2 h-4 w-4" />
					Create Key
				</Button>
			</div>
		</div>
	);
}
