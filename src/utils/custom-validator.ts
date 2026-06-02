import { PERMISSION_SETS, PERMISSION_TOPICS } from "@/configs/constants.ts";
import { APIError } from "@/types/error";

export class CustomValidator {
	static validatePermissionSet(permissions: Record<string, string[]>) {
		for (const t of Object.keys(permissions)) {
			if (
				!Object.values(PERMISSION_TOPICS).includes(
					t as
						| "dashboard"
						| "employees"
						| "roles"
						| "support"
						| "clients"
						| "verticals",
				)
			) {
				throw new APIError("Invalid permission topic", undefined, undefined, 400);
			}

			if (!permissions[t]) continue;

			for (const p of permissions[t]) {
				const normalized = p.trim().toLowerCase();
				const allowedSet = PERMISSION_SETS[
					t as keyof typeof PERMISSION_SETS
				] as Set<string> | undefined;
				const hasMatch = allowedSet
					? [...allowedSet].some(
							(a) =>
								a
									.trim()
									.toLowerCase() === normalized,
						)
					: false;
				if (!hasMatch) {
					throw new APIError("Invalid permission given", undefined, undefined, 400);
				}
			}
		}
	}
}
