"use client";

import { useQueryStates } from "nuqs";

import { Button } from "@/web/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/web/components/ui/dropdown-menu";

import { ROLES, searchParams } from "@/web/lib/searchParams";

export default function RoleSelector() {
	const [{ role }, setSearchParams] = useQueryStates(searchParams);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="capitalize">
					Role: {role}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent>
				{ROLES.map((roleItem) => (
					<DropdownMenuItem key={roleItem} onClick={() => setSearchParams({ role: roleItem })} className="capitalize">
						{roleItem}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
