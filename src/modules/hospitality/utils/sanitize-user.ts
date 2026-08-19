import type { client, vertical_hospitality_employee } from "@/db/types";

type HospitalityUser = client | vertical_hospitality_employee;

export const extractPasswordFromUser = (
	user: HospitalityUser,
): { user: Omit<HospitalityUser, "password">; password_hash: string | null; is_password_set: boolean } => {
	const password_hash = user.password ?? null;
	const { password: _password, ...userWithoutPassword } = user;
	return {
		user: userWithoutPassword as Omit<HospitalityUser, "password">,
		password_hash,
		is_password_set: !!password_hash,
	};
};
