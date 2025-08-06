import { parseAsString, parseAsStringLiteral } from "nuqs";

export const ROLES = ["all", "owner", "collaborator", "admin"] as const;
export type ROLES = (typeof ROLES)[number];

export const searchParams = {
	role: parseAsStringLiteral(ROLES).withDefault(ROLES[0]),
	filter: parseAsString.withDefault(""),

	deployment: parseAsString.withOptions({ clearOnDefault: false }).withDefault("Staging"),
	channel: parseAsString.withOptions({ clearOnDefault: false }).withDefault("Staging"),

	label: parseAsString.withDefault(""),
};
