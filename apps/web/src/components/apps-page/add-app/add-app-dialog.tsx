"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { Input } from "@/web/components/ui/input";

const formSchema = z.object({
	"app-name": z.string().min(3, { message: "App name must be at least 3 characters" }),
	"app-icon": z.string().url({ message: "Enter a valid URL" }),
});

export type AddAppFormValue = z.infer<typeof formSchema>;

interface AddAppDialogProps<T> {
	dialogTitle: string;
	dialogDescription: string;
	triggerButtonText: string;
	mutation: (onSuccess: () => void) => { mutate: (data: T) => void; isPending: boolean };
	onSubmitDataTransform: (data: AddAppFormValue) => T;
}

function AddAppDialog<T>({
	dialogTitle,
	dialogDescription,
	mutation,
	onSubmitDataTransform,
	triggerButtonText,
}: AddAppDialogProps<T>) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const form = useForm<AddAppFormValue>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			"app-name": "",
			"app-icon": "",
		},
	});

	const onSuccessCallback = () => {
		setIsDialogOpen(false);
		form.reset();
	};

	const { mutate, isPending } = mutation(onSuccessCallback);

	const onSubmit = (data: AddAppFormValue) => {
		const transformedData = onSubmitDataTransform(data);
		mutate(transformedData);
	};

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogTrigger asChild>
				<Button variant="secondary">{triggerButtonText}</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-[475px]">
				<DialogHeader>
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2">
						<FormField
							control={form.control}
							name="app-name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>App Name</FormLabel>
									<FormControl>
										<Input type="text" placeholder="My App..." disabled={isPending} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="app-icon"
							render={({ field }) => (
								<FormItem>
									<FormLabel>App Icon URL</FormLabel>
									<FormControl>
										<Input type="url" placeholder="https://google.play/..." disabled={isPending} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" className="ml-auto mt-4" disabled={isPending}>
								{isPending ? <LoadingSpinner /> : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export default AddAppDialog;
