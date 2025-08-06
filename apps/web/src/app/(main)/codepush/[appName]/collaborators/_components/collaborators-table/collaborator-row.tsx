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
import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";
import { Button } from "@/web/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/web/components/ui/select";
import { TableCell, TableRow } from "@/web/components/ui/table";
import {
	useDeleteCollaboratorMutation,
	useUpdateCollaboratorPermissionMutation,
} from "@/web/lib/client/codepush-queries";
import { Edit2, Loader, Trash2 } from "lucide-react";
import { useState } from "react";

type Collaborator = {
	user: {
		id: string;
		name: string;
		email: string;
		image: string | null;
	};
	appId: string;
	permission: "collaborator" | "admin" | "owner";
	userId: string;
};

type CollaboratorRowProps = {
	collaborator: Collaborator;
	appName: string;
};

export function CollaboratorRow({ collaborator }: CollaboratorRowProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const onPermissionSuccessCallback = () => setIsEditing(false);

	const onDeletionSuccessCallback = () => setIsDeleting(false);

	const updatePermissionMutation = useUpdateCollaboratorPermissionMutation(onPermissionSuccessCallback);

	const deleteCollaboratorMutation = useDeleteCollaboratorMutation(onDeletionSuccessCallback);

	return (
		<>
			<TableRow>
				<TableCell className="font-medium">
					<div className="flex items-center space-x-3">
						<Avatar>
							<AvatarImage src={collaborator.user.image || undefined} />
							<AvatarFallback>{collaborator.user.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<span>{collaborator.user.name}</span>
					</div>
				</TableCell>

				<TableCell>{collaborator.user.email}</TableCell>

				<TableCell className="w-[200px]">
					{isEditing ? (
						<Select
							defaultValue={collaborator.permission}
							disabled={updatePermissionMutation.isPending} // Disable during loading
							onValueChange={(value) =>
								updatePermissionMutation.mutate({
									email: collaborator.user.email,
									permission: value as Collaborator["permission"],
								})
							}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Select a permission" />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value="collaborator">Collaborator</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
								<SelectItem value="owner">Owner</SelectItem>
							</SelectContent>
						</Select>
					) : (
						<span className="capitalize">{collaborator.permission}</span>
					)}
				</TableCell>

				<TableCell>
					<div className="flex space-x-2">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setIsEditing(!isEditing)}
							disabled={updatePermissionMutation.isPending} // Disable button during edit mutation
						>
							{updatePermissionMutation.isPending ? (
								<Loader className="h-4 w-4 animate-spin" />
							) : (
								<Edit2 className="h-4 w-4" />
							)}
						</Button>

						<Button
							variant="outline"
							size="icon"
							onClick={() => setIsDeleting(true)}
							disabled={deleteCollaboratorMutation.isPending} // Disable button during delete mutation
						>
							{deleteCollaboratorMutation.isPending ? (
								<Loader className="h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="h-4 w-4" />
							)}
						</Button>
					</div>
				</TableCell>
			</TableRow>

			<AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure you want to delete this collaborator?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently remove the collaborator from the app.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteCollaboratorMutation.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteCollaboratorMutation.mutate(collaborator.user.email)}
							disabled={deleteCollaboratorMutation.isPending}
						>
							{deleteCollaboratorMutation.isPending ? <Loader className="h-4 w-4 animate-spin" /> : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
