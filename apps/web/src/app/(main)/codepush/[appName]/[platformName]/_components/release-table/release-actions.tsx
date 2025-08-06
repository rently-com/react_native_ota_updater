"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/web/components/ui/alert-dialog";
import { Button } from "@/web/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/web/components/ui/select";
import {
	getPlatformDeploymentsQueryOptions,
	useDeleteReleaseMutation,
	usePromoteReleaseMutation,
	useRollbackReleaseMutation,
} from "@/web/lib/client/codepush-queries";
import { searchParams } from "@/web/lib/searchParams";
import { useSuspenseQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Trash2 } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useState } from "react";

export function ReleaseActions() {
	const [{ deployment, label }, setParams] = useQueryStates(searchParams);

	if (!label) return null;

	const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
	const [isRollbackDialogOpen, setIsRollbackDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const { data: platformDeployments } = useSuspenseQuery(getPlatformDeploymentsQueryOptions());
	const deployments = platformDeployments.filter((d) => d.name !== deployment) ?? [];
	const defaultDeployment = deployments.length === 1 ? deployments[0]!.name : null;

	const [targetDeployment, setTargetDeployment] = useState<string | null>(defaultDeployment);

	const onPromoteSuccessCallback = () => {
		setIsPromoteDialogOpen(false);

		const end = Date.now() + 3 * 1000; // 3 seconds
		const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

		const frame = () => {
			if (Date.now() > end) return;

			confetti({
				particleCount: 2,
				angle: 60,
				spread: 55,
				startVelocity: 60,
				origin: { x: 0, y: 0.5 },
				colors: colors,
			});
			confetti({
				particleCount: 2,
				angle: 120,
				spread: 55,
				startVelocity: 60,
				origin: { x: 1, y: 0.5 },
				colors: colors,
			});

			requestAnimationFrame(frame);
		};

		frame();
	};

	const onRollbackSuccessCallback = () => setIsRollbackDialogOpen(false);

	const onDeleteSuccessCallback = () => {
		setIsDeleteDialogOpen(false);
		setParams({ label: null });
	};

	const promoteMutation = usePromoteReleaseMutation(onPromoteSuccessCallback);

	const rollbackMutation = useRollbackReleaseMutation(onRollbackSuccessCallback);

	const deleteMutation = useDeleteReleaseMutation(onDeleteSuccessCallback);

	return (
		<>
			<div className="flex space-x-2 mt-2">
				<Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive">
					<Trash2 className="w-4 h-4" />
				</Button>
				<Button onClick={() => setIsPromoteDialogOpen(true)}>Promote</Button>
				<Button onClick={() => setIsRollbackDialogOpen(true)} variant="outline">
					Rollback
				</Button>
			</div>

			<AlertDialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Promote Release</AlertDialogTitle>
						<AlertDialogDescription>Select a deployment to promote this release to.</AlertDialogDescription>
					</AlertDialogHeader>

					<Select onValueChange={setTargetDeployment} defaultValue={targetDeployment ?? undefined}>
						<SelectTrigger>
							<SelectValue placeholder="Select deployment" />
						</SelectTrigger>

						<SelectContent>
							{deployments.map((deployment) => (
								<SelectItem key={deployment.key} value={deployment.name}>
									{deployment.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setTargetDeployment(null)}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => promoteMutation.mutate(targetDeployment!)} disabled={!targetDeployment}>
							Promote
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={isRollbackDialogOpen} onOpenChange={setIsRollbackDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Rollback Release</AlertDialogTitle>
						<AlertDialogDescription>Are you sure you want to rollback to this release?</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => rollbackMutation.mutate()}>Rollback</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Release</AlertDialogTitle>
						<AlertDialogDescription>Are you sure you want to delete this release?</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
