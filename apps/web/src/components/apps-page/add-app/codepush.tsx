"use client";

import { useAddAppMutation } from "@/web/lib/client/codepush-queries";
import AddAppDialog, { type AddAppFormValue } from "./add-app-dialog";

interface CodePushMutationData {
	appName: string;
	appIcon: string;
}

export default function AddNewCodePushApp() {
	const mutation = (onSuccess: () => void) => useAddAppMutation(onSuccess);

	const onSubmitDataTransform = (data: AddAppFormValue): CodePushMutationData => ({
		appName: data["app-name"],
		appIcon: data["app-icon"],
	});

	return (
		<AddAppDialog<CodePushMutationData>
			dialogTitle="Create New CodePush App"
			dialogDescription="Fill in the details below to create a new CodePush app."
			triggerButtonText="New App"
			mutation={mutation}
			onSubmitDataTransform={onSubmitDataTransform}
		/>
	);
}
