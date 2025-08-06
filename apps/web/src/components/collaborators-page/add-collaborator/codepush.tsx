"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { getCollaboratorsQueryOptions, useBulkAddCollaboratorMutation } from "@/web/lib/client/codepush-queries";

import AddCollaboratorDialog, { type AddCollaboratorFormValue, type PERMISSIONS } from "./add-collaborator-dialog";

interface CodePushMutationData {
	emails: string[];
	permission: (typeof PERMISSIONS)[number];
}

export default function AddNewCollaborator() {
	const mutation = (onSuccess: () => void) => useBulkAddCollaboratorMutation(onSuccess);
	const { data: codepushCollaborators } = useSuspenseQuery(getCollaboratorsQueryOptions());

	const onSubmitDataTransform = (data: AddCollaboratorFormValue): CodePushMutationData => ({
		emails: data["collaborator-emails"],
		permission: data["collaborator-permission"],
	});

	const codepushUsers = codepushCollaborators.map((codepushCollaborator) => codepushCollaborator.user);

	return (
		<AddCollaboratorDialog<CodePushMutationData>
			dialogTitle="Bulk Add Collaborators"
			dialogDescription="Select multiple users to add as collaborators with the same permission level."
			triggerButtonText="Bulk Add Collaborators"
			mutation={mutation}
			onSubmitDataTransform={onSubmitDataTransform}
			existingUsers={codepushUsers}
		/>
	);
}
