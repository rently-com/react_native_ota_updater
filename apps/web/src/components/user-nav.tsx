"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";
import { Button } from "@/web/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/web/components/ui/dropdown-menu";
import { Skeleton } from "@/web/components/ui/skeleton";
import { setUserLoggedOut } from "@/web/lib/cookie";

import { signOut, useSession } from "@rentlydev/rnota-auth/react";

import { LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";

export function UserNav() {
	const { data: session } = useSession();

	const handleSignOut = () => {
		// Set the user-logged-out flag before signing out
		setUserLoggedOut();
		signOut();
	};

	if (session) {
		const { image, name, email } = session.user ?? {};

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="relative h-8 w-8 rounded-full">
						<Avatar className="h-8 w-8">
							<AvatarImage src={image ?? ""} alt={name ?? ""} />
							<AvatarFallback>{name?.[0]}</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent className="w-56" align="end" forceMount>
					<DropdownMenuLabel className="font-normal">
						<div className="flex flex-col space-y-1">
							<p className="text-sm font-medium leading-none">{name}</p>
							<p className="text-xs leading-none text-muted-foreground">{email}</p>
						</div>
					</DropdownMenuLabel>

					<DropdownMenuSeparator />

					<Link href="/users">
						<DropdownMenuItem>
							<Users size={16} />
							Users
						</DropdownMenuItem>
					</Link>

					<DropdownMenuSeparator />

					<Link href="/settings">
						<DropdownMenuItem>
							<Settings size={16} />
							Settings
						</DropdownMenuItem>
					</Link>

					<DropdownMenuSeparator />

					<DropdownMenuItem onClick={handleSignOut}>
						<LogOut size={16} />
						Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return <Skeleton className="h-8 w-8 rounded-full" />;
}
