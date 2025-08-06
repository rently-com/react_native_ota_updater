"use client";

type CircularProgressProps = {
	value: number;
	label: string;
	size?: number;
	strokeWidth?: number;
	color?: string;
	subtitle?: string;
};

export function CircularProgress({
	value,
	label,
	size = 120,
	strokeWidth = 6,
	color = "currentColor",
	subtitle,
}: CircularProgressProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (value / 100) * circumference;

	return (
		<div className="relative" style={{ width: size, height: size }}>
			{/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
			<svg className="transform -rotate-90" style={{ width: size, height: size }}>
				<circle
					className="text-muted-foreground/20"
					strokeWidth={strokeWidth}
					stroke="currentColor"
					fill="transparent"
					r={radius}
					cx={size / 2}
					cy={size / 2}
				/>
				<circle
					stroke={color}
					strokeWidth={strokeWidth}
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					fill="transparent"
					r={radius}
					cx={size / 2}
					cy={size / 2}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
				<div className="text-xs text-muted-foreground">{label}</div>
				<div className="text-2xl font-semibold">{value}%</div>
				{subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
			</div>
		</div>
	);
}
