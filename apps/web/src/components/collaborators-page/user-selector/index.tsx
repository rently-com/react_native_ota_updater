"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";
import { Combobox } from "@/web/components/ui/combobox";
import { type TUsers, getAllUsersQueryOptions } from "@/web/lib/client/common-queries";

interface UserSelectorProps {
	value?: string;
	onChangeAction: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	existingUsers: TUsers;
}

export function UserSelector({
	value,
	onChangeAction,
	placeholder = "",
	disabled = false,
	existingUsers,
}: UserSelectorProps) {
	const { data: users } = useSuspenseQuery(getAllUsersQueryOptions());

	const filteredUsers = users.filter((user) => !existingUsers.some((existingUser) => existingUser.id === user.id));

	const options = filteredUsers.map((user) => ({
		label: (
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
		),

		value: user.email,
	}));

	return (
		<Combobox
			options={options}
			value={value}
			onChangeAction={onChangeAction}
			placeholder={placeholder}
			emptyText="No users found"
			className="w-full"
			disabled={disabled}
		/>
	);
}
