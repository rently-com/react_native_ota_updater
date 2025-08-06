"use client";

import { Button } from "@/web/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/web/components/ui/dialog";
import { Input } from "@/web/components/ui/input";
import { Label } from "@/web/components/ui/label";
import { Slider } from "@/web/components/ui/slider";
import { Switch } from "@/web/components/ui/switch";
import { Textarea } from "@/web/components/ui/textarea";
import { useUpdateReleaseMutation } from "@/web/lib/client/codepush-queries";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { useState } from "react";
import { toast } from "sonner";

type Release = {
	id: number;
	label: string;
	appVersion: string;
	description: string | null;
	isDisabled: boolean;
	isMandatory: boolean;
	rollout: number | null;
};

type EditReleaseDialogProps = {
	release: Release;
};

export function EditReleaseDialog({ release }: EditReleaseDialogProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editedRelease, setEditedRelease] = useState(release);

	const onSuccessCallback = () => setIsDialogOpen(false);

	const updateReleaseMutation = useUpdateReleaseMutation(onSuccessCallback);

	const handleSave = () => {
		const updatedFields = {
			label: editedRelease.label,
			appVersion: editedRelease.appVersion !== release.appVersion ? editedRelease.appVersion : undefined,
			description: editedRelease.description !== release.description ? editedRelease.description : undefined,
			rollout: editedRelease.rollout !== release.rollout ? editedRelease.rollout : undefined,
			isDisabled: editedRelease.isDisabled !== release.isDisabled ? editedRelease.isDisabled : undefined,
			isMandatory: editedRelease.isMandatory !== release.isMandatory ? editedRelease.isMandatory : undefined,
		};

		// Check if the object has only 1 key with a defined value
		const definedFieldCount = Object.values(updatedFields).filter((value) => value !== undefined).length;
		if (definedFieldCount === 1) {
			setIsDialogOpen(false);
			toast.info("Not Modified");
			return;
		}

		updateReleaseMutation.mutate(updatedFields);
	};

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogTrigger asChild>
				<Button variant="secondary">Edit Release</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Edit &apos;{release.label}&apos;</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<div className="space-y-2">
						<Label htmlFor="targetVersion" className="text-sm font-medium">
							Target Version:
						</Label>
						<Input
							id="targetVersion"
							value={editedRelease.appVersion}
							onChange={(e) => setEditedRelease({ ...editedRelease, appVersion: e.target.value })}
						/>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="description" className="text-sm font-medium">
								Description:
							</Label>
						</div>
						<Textarea
							id="description"
							value={editedRelease.description || ""}
							onChange={(e) => setEditedRelease({ ...editedRelease, description: e.target.value })}
							className="min-h-[100px]"
						/>
						<p className="text-xs text-muted-foreground">
							Styling with Markdown is supported. 5000 characters or less.
						</p>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-sm font-medium">Enabled:</Label>
								<p className="text-xs text-muted-foreground">
									When disabled, this update will not be available to your users.
								</p>
							</div>
							<Switch
								checked={!editedRelease.isDisabled}
								onCheckedChange={(checked) => setEditedRelease({ ...editedRelease, isDisabled: !checked })}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-sm font-medium">Required Update:</Label>
								<p className="text-xs text-muted-foreground">When enabled, users must update to this version.</p>
							</div>
							<Switch
								checked={editedRelease.isMandatory}
								onCheckedChange={(checked) => setEditedRelease({ ...editedRelease, isMandatory: checked })}
							/>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium">Rollout:</Label>
							<div className="flex items-center gap-4">
								<Slider
									value={[editedRelease.rollout ?? 100]}
									onValueChange={([value]) => setEditedRelease({ ...editedRelease, rollout: value ?? 100 })}
									max={100}
									min={1}
									step={1}
									className="flex-1"
								/>
								<input
									type="number"
									min="1"
									max="100"
									step="1"
									className="w-20 text-sm border rounded-md px-2 py-1"
									value={editedRelease.rollout ?? 100}
									onChange={(e) => {
										const value = Number.parseInt(e.target.value);
										if (!Number.isNaN(value) && value >= 1 && value <= 100) {
											setEditedRelease({ ...editedRelease, rollout: value });
										} else if (e.target.value === "") {
											setEditedRelease({ ...editedRelease, rollout: 100 }); // or maybe null? decide default behavior
										}
									}}
								/>
								%
							</div>
							<p className="text-xs text-muted-foreground">
								The percentage of users eligible for this update (value can only be increased).
							</p>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button type="submit" onClick={handleSave} disabled={updateReleaseMutation.isPending}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
