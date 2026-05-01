import type { AdminWithRole } from "@/db/actions/admin.actions.ts";
import type {
	PermissionAllowed,
	TopicKey,
} from "@/types/common/permissions-set.ts";
import { APIError } from "@/types/error";

interface CheckAdminPermissionArgs {
	admin?: AdminWithRole;
	is_super_admin?: boolean;
	permissions_allowed: PermissionAllowed;
}

interface PermsResponse {
	perm: Record<string, string[]>;
	is_super_admin?: boolean;
}

export class Permission {
	static checkAdminPermissions(
		args: CheckAdminPermissionArgs,
	): PermsResponse {
		if (!args.admin) {
			throw new APIError("Unauthorized access", undefined, undefined, 401);
		}

		const rolesPermissions: Record<string, string[]> | undefined = args
			.admin.role?.permissions_json
			? (args.admin.role?.permissions_json as Record<string, string[]>)
			: {};

		if (args.admin.role?.is_super_admin) {
			return {
				is_super_admin: true,
				perm: rolesPermissions,
			};
		}

		if (args.is_super_admin && !args.admin.role?.is_super_admin) {
			throw new APIError(
				"This resource can only accessed by super admins",
				undefined,
				undefined,
				403,
			);
		}

		if (!rolesPermissions) {
			throw new APIError(
				`You do not have enough permissions to perform the intended action`,
				undefined,
				undefined,
				403,
			);
		}

		for (const permission of Object.keys(args.permissions_allowed)) {
			if (!rolesPermissions[permission]) {
				throw new APIError(
					`You do not have ${permission} access to perform the intended action`,
					undefined,
					undefined,
					403,
				);
			}

			const myPerms = new Set(rolesPermissions[permission]);
			const requiredPerms =
				args.permissions_allowed[permission as TopicKey];

			if (!requiredPerms) {
				continue;
			}

			for (const perm of requiredPerms) {
				if (!myPerms.has(perm as unknown as string)) {
					throw new APIError(
						`You do not have ${perm} access to perform the intended action`,
						undefined,
						undefined,
						403,
					);
				}
			}
		}

		return {
			is_super_admin: false,
			perm: rolesPermissions,
		};
	}
}
