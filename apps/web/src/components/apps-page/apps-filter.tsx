"use client";

import { Search } from "lucide-react";
import { useQueryStates } from "nuqs";

import { Input } from "@/web/components/ui/input";
import { searchParams } from "@/web/lib/searchParams";

export default function AppsFilter() {
	const [{ filter }, setSearchParams] = useQueryStates(searchParams);

	const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.value === "") {
			setSearchParams({ filter: null });
			return;
		}

		setSearchParams({ filter: e.target.value });
	};

	return (
		<div className="flex items-center gap-2 rounded-md border bg-background px-2">
			<Search className="h-4 w-4 text-muted-foreground" />

			<Input
				type="search"
				placeholder="Search"
				className="border-0 focus-visible:ring-0"
				value={filter}
				onChange={onChangeHandler}
			/>
		</div>
	);
}
