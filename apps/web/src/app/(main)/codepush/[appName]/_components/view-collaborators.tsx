"use client";

import { Button } from "@/web/components/ui/button";
import { useAppName } from "@/web/store/store";
import { Users } from "lucide-react";
import Link from "next/link";

export default function ViewCollaborators() {
	const appName = useAppName();

	return (
		<>
			<Link href={`/codepush/${appName}/collaborators`}>
				<Button variant="outline" className="w-full sm:w-auto">
					<Users className="mr-2 h-4 w-4" />
					View Collaborators
				</Button>
			</Link>
		</>
	);
}
