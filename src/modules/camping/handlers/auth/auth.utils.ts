export const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();

export const buildCampingClientLookupWhere = (email: string) => ({
	email: normalizeAuthEmail(email),
	vertical: {
		name: "Camping",
	},
});
