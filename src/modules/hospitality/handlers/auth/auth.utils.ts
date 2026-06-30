export const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();

export const buildHospitalityClientLookupWhere = (email: string) => ({
	email: normalizeAuthEmail(email),
	vertical: {
		name: "Hospitality",
	},
});
