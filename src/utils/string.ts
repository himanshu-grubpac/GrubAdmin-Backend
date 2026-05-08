/**
 * Normalizes a role name by trimming, lowercasing, and collapsing multiple spaces.
 * Example: "  Admin   Manager  " -> "admin manager"
 */
export const normalizeRoleName = (name: string): string => {
	return name
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
};


export const sanitizeCsvValue = (value: any): any => {
	if (value === null || value === undefined) return "";
	
	if (typeof value === "object" && !(value instanceof Date)) {
		if (Array.isArray(value)) {
			return value.map(sanitizeCsvValue);
		}
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, sanitizeCsvValue(v)])
		);
	}

	const stringValue = String(value);

	if (/^[=+\-@]/.test(stringValue.trim())) {
		return `'${stringValue}`;
	}

	return stringValue;
};
