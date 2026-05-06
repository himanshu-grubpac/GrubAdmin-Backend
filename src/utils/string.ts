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


export const sanitizeCsvValue = (value: any): string => {
	if (value === null || value === undefined) return "";
	const stringValue = String(value);


	if (/^[=+\-@]/.test(stringValue.trim())) {
		return `'${stringValue}`;
	}

	return stringValue;
};
