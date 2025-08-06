"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/web/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/web/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/web/components/ui/popover";
import { cn } from "@/web/lib/utils";

export interface ComboboxProps {
	options: { label: string | React.ReactNode; value: string }[];
	value?: string;
	onChangeAction: (value: string) => void;
	placeholder?: string;
	emptyText?: string;
	className?: string;
	disabled?: boolean;
}

export function Combobox({
	options,
	value,
	onChangeAction,
	placeholder = "Select an option",
	emptyText = "No results found.",
	className,
	disabled = false,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");

	const filteredOptions = React.useMemo(() => {
		if (!searchQuery) return options;
		const lowerQuery = searchQuery.toLowerCase();

		return options.filter((option) => {
			if (typeof option.label === "string") {
				return option.label.toLowerCase().includes(lowerQuery);
			}
			// For React elements, search by value
			return option.value.toLowerCase().includes(lowerQuery);
		});
	}, [options, searchQuery]);

	const selectedLabel = React.useMemo(() => {
		const selectedOption = options.find((option) => option.value === value);
		if (!selectedOption) return placeholder;
		if (typeof selectedOption.label === "string") return selectedOption.label;
		// For React elements, show a simplified version in the button
		return selectedOption.value;
	}, [value, options, placeholder]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					aria-expanded={open}
					aria-disabled={disabled}
					className={cn("w-full justify-between", disabled && "opacity-50 cursor-not-allowed", className)}
					disabled={disabled}
				>
					{selectedLabel}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>

			<PopoverContent align="start" className="p-0">
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={`Search ${placeholder.toLowerCase()}...`}
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>

					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>

						<CommandGroup>
							{filteredOptions.map((option) => (
								<CommandItem
									key={option.value}
									value={option.value}
									onSelect={() => {
										onChangeAction(option.value);
										setSearchQuery("");
										setOpen(false);
									}}
								>
									<Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
