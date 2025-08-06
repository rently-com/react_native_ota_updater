import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/web/components/ui/card";
import { Icons } from "@/web/components/ui/icons";

interface Item {
	title: string;
	url: string;
	icon: keyof typeof Icons; // Ensures the icon is a valid key from the Icons object
	description: string;
}

const items: Item[] = [
	{
		title: "CodePush Apps",
		url: "/codepush",
		icon: "codepush", // Use the key of the icon in the Icons object
		description: "Manage your CodePush applications.",
	},
];

interface CardItemProps {
	item: Item;
}

const CardItem = ({ item }: CardItemProps) => {
	const { title, url, icon: IconName, description } = item;
	const Icon = Icons[IconName]; // Access the Icon component using the key

	return (
		<Link href={url} className="group block" key={url}>
			<Card className="overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/25 dark:hover:shadow-primary/50 transform hover:scale-105">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

				<CardHeader className="relative z-10">
					<div className="mb-2 flex items-center space-x-2">
						<Icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
						<CardTitle className="text-xl font-bold">{title}</CardTitle>
					</div>
				</CardHeader>

				<CardContent className="relative z-10">
					<CardDescription className="text-sm">{description}</CardDescription>
				</CardContent>

				<div className="absolute bottom-4 right-4 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
					<Icon className="h-6 w-6 text-primary" />
				</div>
			</Card>
		</Link>
	);
};

export default function ManageCard() {
	return (
		<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
			{items.map((item) => (
				<CardItem key={item.url} item={item} />
			))}
		</div>
	);
}
