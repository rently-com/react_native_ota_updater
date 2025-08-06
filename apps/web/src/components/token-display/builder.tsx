import type React from "react";

import { Button } from "@/web/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/web/components/ui/card";
import { Input } from "@/web/components/ui/input";

interface TokenDisplayBuilderProps {
	title: React.ReactNode;
	description: React.ReactNode;
	inputValue: string;
	inputDisabled?: boolean;
	buttonDisabled?: boolean;
	buttonIcon: React.ReactNode;
	onButtonClick?: () => void;
	footer: React.ReactNode;
}

export default function TokenDisplayBuilder({
	title,
	description,
	inputValue,
	inputDisabled = false,
	buttonDisabled = false,
	buttonIcon,
	onButtonClick,
	footer,
}: TokenDisplayBuilderProps) {
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>

			<CardContent className="space-y-6">
				<div className="space-y-2">
					<div className="flex gap-2">
						<Input readOnly disabled={inputDisabled} value={inputValue} className="font-mono text-sm" />

						<Button
							variant="outline"
							size="icon"
							onClick={onButtonClick}
							disabled={buttonDisabled}
							className="shrink-0"
						>
							{buttonIcon}
						</Button>
					</div>
				</div>
			</CardContent>

			<CardFooter className="flex flex-col items-start gap-4">{footer}</CardFooter>
		</Card>
	);
}
