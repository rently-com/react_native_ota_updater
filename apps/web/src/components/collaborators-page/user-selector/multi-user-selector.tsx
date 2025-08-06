"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";
import { Badge } from "@/web/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/web/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/web/components/ui/popover";
import { type TUsers, getAllUsersQueryOptions } from "@/web/lib/client/common-queries";
import { cn } from "@/web/lib/utils";

interface MultiUserSelectorProps {
	values: string[];
	onChangeAction: (values: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
	existingUsers: TUsers;
}

export function MultiUserSelector({
	values = [],
	onChangeAction,
	placeholder = "Select users",
	disabled = false,
	existingUsers,
}: MultiUserSelectorProps) {
	const { data: users } = useSuspenseQuery(getAllUsersQueryOptions());
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	// Filter out users that are already collaborators
	const availableUsers = users.filter((user) => !existingUsers.some((existingUser) => existingUser.id === user.id));

	// Filter based on search query
	const filteredUsers = searchQuery
		? availableUsers.filter(
				(user) =>
					user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					user.email.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: availableUsers;

	// Also filter out users that are already selected
	const selectableUsers = filteredUsers.filter((user) => !values.includes(user.email));

	// Get user details for selected emails
	const selectedUsers = users.filter((user) => values.includes(user.email));

	const handleSelect = (email: string) => {
		if (!values.includes(email)) {
			onChangeAction([...values, email]);
		}
	};

	const handleRemove = (email: string) => {
		onChangeAction(values.filter((value) => value !== email));
	};

	return (
		<div className="flex flex-col gap-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<div
						className={cn(
							"flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
							disabled && "cursor-not-allowed opacity-50",
							values.length === 0 ? "text-muted-foreground" : "",
						)}
					>
						{values.length === 0 ? (
							<span>{placeholder}</span>
						) : (
							<div className="flex flex-wrap gap-1 overflow-hidden">
								{selectedUsers.map((user) => (
									<Badge key={user.email} variant="secondary" className="mr-1 mb-1">
										{user.name || user.email}
										<button
											type="button"
											className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
											onClick={(e) => {
												e.stopPropagation();
												if (!disabled) handleRemove(user.email);
											}}
										>
											<X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
										</button>
									</Badge>
								))}
							</div>
						)}
					</div>
				</PopoverTrigger>
				<PopoverContent className="w-full p-0" align="start">
					<Command shouldFilter={false}>
						<CommandInput
							placeholder="Search users..."
							value={searchQuery}
							onValueChange={setSearchQuery}
							className="h-9"
						/>
						<CommandList>
							<CommandEmpty>No users found</CommandEmpty>
							<CommandGroup>
								{selectableUsers.map((user) => (
									<CommandItem
										key={user.id}
										value={user.email}
										onSelect={() => {
											handleSelect(user.email);
											setSearchQuery("");
										}}
									>
										<div className="flex items-center gap-2">
											<Avatar className="h-6 w-6">
												<AvatarImage src={user.image || undefined} />
												<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
											</Avatar>
											<div className="flex flex-col">
												<span className="font-medium">{user.name}</span>
												<span className="text-xs text-muted-foreground">{user.email}</span>
											</div>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
