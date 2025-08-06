"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import LoadingSpinner from "@/web/components/loading-spinner";
import { Button } from "@/web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/web/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/web/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/web/components/ui/select";
import type { TUsers } from "@/web/lib/client/common-queries";
import { ROLES } from "@/web/lib/searchParams";

import { UserSelectorLoading } from "../user-selector/loading";
import { MultiUserSelector } from "../user-selector/multi-user-selector";

export const PERMISSIONS = [ROLES[1], ROLES[2], ROLES[3]] as const;

const formSchema = z.object({
	"collaborator-emails": z.array(z.string().email({ message: "Please enter valid emails" })).min(1, {
		message: "Please select at least one collaborator",
	}),
	"collaborator-permission": z.enum(PERMISSIONS),
});

export type AddCollaboratorFormValue = z.infer<typeof formSchema>;

interface AddCollaboratorDialogProps<T> {
	dialogTitle: string;
	dialogDescription: string;
	triggerButtonText: string;
	mutation: (onSuccess: () => void) => { mutate: (data: T) => void; isPending: boolean };
	onSubmitDataTransform: (data: AddCollaboratorFormValue) => T;
	existingUsers: TUsers;
}

function AddCollaboratorDialog<T>({
	dialogTitle,
	dialogDescription,
	mutation,
	onSubmitDataTransform,
	triggerButtonText,
	existingUsers,
}: AddCollaboratorDialogProps<T>) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const form = useForm<AddCollaboratorFormValue>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			"collaborator-emails": [],
			"collaborator-permission": PERMISSIONS[1],
		},
	});

	const onSuccessCallback = () => {
		setIsDialogOpen(false);
		form.reset();
	};

	const { mutate, isPending } = mutation(onSuccessCallback);

	const onSubmit = (data: AddCollaboratorFormValue) => {
		const transformedData = onSubmitDataTransform(data);
		mutate(transformedData);
	};

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogTrigger asChild>
				<Button variant="secondary">{triggerButtonText}</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2">
						<FormField
							control={form.control}
							name="collaborator-emails"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Collaborators</FormLabel>
									<FormControl>
										<Suspense fallback={<UserSelectorLoading />}>
											<MultiUserSelector
												values={field.value}
												onChangeAction={field.onChange}
												placeholder="Select collaborators"
												existingUsers={existingUsers}
											/>
										</Suspense>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="collaborator-permission"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Permission</FormLabel>

									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a permission" />
											</SelectTrigger>
										</FormControl>

										<SelectContent>
											{PERMISSIONS.map((permission) => (
												<SelectItem key={permission} value={permission} className="capitalize">
													{permission}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" className="ml-auto mt-4" disabled={isPending}>
								{isPending ? <LoadingSpinner /> : "Add Collaborators"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export default AddCollaboratorDialog;
