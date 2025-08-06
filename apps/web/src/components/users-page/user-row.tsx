import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";
import { TableCell, TableRow } from "@/web/components/ui/table";
import type { TUsers } from "@/web/lib/client/common-queries";

interface UserRowProps {
	user: TUsers[number];
}

export function UserRow({ user }: UserRowProps) {
	return (
		<TableRow>
			<TableCell className="font-medium">
				<div className="flex items-center space-x-3">
					<Avatar>
						<AvatarImage src={user.image || undefined} alt={user.name} />
						<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
					</Avatar>
					<span>{user.name}</span>
				</div>
			</TableCell>
			<TableCell>{user.email}</TableCell>
			<TableCell>{format(new Date(user.createdAt), "PPP 'at' p")}</TableCell>
		</TableRow>
	);
}
