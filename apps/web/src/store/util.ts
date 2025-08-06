export function getParamDecoded(param: string | string[] | undefined): string | null {
	if (typeof param !== "string") return null;
	const result = decodeURIComponent(param);
	return result;
}
