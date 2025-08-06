import type { LucideProps } from "lucide-react";

export const BRANDING = {
	name: "Rently",
	// Rently Company Logo
	logo: ({ ...props }: LucideProps) => (
		<svg width="78" height="110" viewBox="0 0 78 110" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<title>Rently</title>
			<g clipPath="url(#clip0_2_2)">
				<path
					d="M67.7129 20.8943V6.15899H54.543V11.2161L39.282 0L0 28.4557V80.743C0 89.1528 6.77347 96.0322 15.0507 96.0322H44.7475C45.3203 96.9086 54.1065 110 67.7115 110C67.7115 110 61.1903 103.515 61.1628 96.0322H62.9493C71.228 96.0322 78 89.1514 78 80.743V28.4557L67.71 20.8943H67.7129Z"
					fill="currentColor"
				/>
			</g>
			<defs>
				<clipPath id="clip0_2_2">
					<rect width="78" height="110" fill="currentColor" />
				</clipPath>
			</defs>
		</svg>
	),
};
