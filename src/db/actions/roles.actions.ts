import { prisma } from "@/db";
import { type Prisma, type role } from "@/db/types";
import { APIError } from "@/types/error";
import { normalizeRoleName } from "@/utils/string.ts";
import { getAllPermissions } from "@/configs/constants.ts";

interface CreateRoleArgs {
	name: string;
	permissions?: Record<string, string[] | Record<string, string>>;
	isSuperAdmin?: boolean;
}

export const createRole = async (args: CreateRoleArgs) => {
	const normalizedName = normalizeRoleName(args.name);

	try {
		return await prisma.role.create({
			data: {
				name: args.name.trim(),
				name_normalized: normalizedName,
				permissions_json: args.isSuperAdmin
					? getAllPermissions()
					: (args.permissions ?? {}),
				is_super_admin: args.isSuperAdmin ?? false,
			},
		});
	} catch (error: any) {
		if (error.code === "P2002") {
			throw new APIError("Role name already exists", undefined, undefined, 400);
		}
		throw error;
	}
};

interface GetRolesArgs {
	query?: string;
	pageNumber: number;
	pageSize: number;
	hideAssigned?: boolean;
}

interface GetRolesResponse {
	roles: role[];
	count: number;
}

export const getRoles = async (
	args: GetRolesArgs,
): Promise<GetRolesResponse> => {
	const { query, pageSize, pageNumber, hideAssigned } = args;

	const rolesQuery: Prisma.roleFindManyArgs = {
		where: {
			name: query
				? {
						contains: query,
					}
				: undefined,
			NOT: {
				status: "deleted",
			},
			admins: hideAssigned
				? {
						none: {},
					}
				: undefined,
		},
		take: pageSize,
		skip: (pageNumber - 1) * pageSize,
		include: {
			_count: {
				select: {
					admins: true,
				},
			},
		},
	};

	const [rolesResponse, rolesCountResponse] = await Promise.allSettled([
		prisma.role.findMany(rolesQuery),
		prisma.role.count({
			where: rolesQuery.where,
		}),
	]);

	if (rolesResponse.status === "rejected") {
		throw new APIError(String(rolesResponse.reason), undefined, undefined, 400);
	}

	if (rolesCountResponse.status === "rejected") {
		throw new APIError(String(rolesCountResponse.reason), undefined, undefined, 400);
	}

	return {
		roles: rolesResponse.value,
		count: rolesCountResponse.value,
	};
};

interface UpdateRoleArgs {
	id: string;
	name?: string;
	permissions?: Record<string, string[] | Record<string, string>>;
	isSuperAdmin?: boolean;
}

export const updateRole = async (args: UpdateRoleArgs) => {
	const existingRole = await prisma.role.findUnique({
		where: { id: args.id },
	});

	if (!existingRole || existingRole.status === "deleted") {
		throw new APIError("Role not found", undefined, undefined, 404);
	}

	// If it's a Super Admin role, prevent demotion or deactivation
	if (existingRole.is_super_admin) {
		if (args.isSuperAdmin === false) {
			throw new APIError("Super Admin role cannot be demoted", undefined, undefined, 400);
		}
	}

	const isOrWillBeSuperAdmin = existingRole.is_super_admin || args.isSuperAdmin === true;

	const data: Prisma.roleUpdateInput = {};

	if (isOrWillBeSuperAdmin) {
		data.permissions_json = getAllPermissions();
	} else if (args.permissions !== undefined) {
		data.permissions_json = args.permissions;
	}

	if (args.name) {
		data.name = args.name.trim();
		data.name_normalized = normalizeRoleName(args.name);
	}

	if (args.isSuperAdmin === true) {
		data.is_super_admin = true;
	}

	try {
		return await prisma.role.update({
			where: {
				id: args.id,
				NOT: {
					status: "deleted",
				},
			},
			data,
		});
	} catch (error: any) {
		if (error.code === "P2002") {
			throw new APIError("Another role with this name already exists", undefined, undefined, 400);
		}
		throw error;
	}
};

interface DeleteRoleArgs {
	id: string;
}

export const deleteRole = async (args: DeleteRoleArgs) => {
	try {
		return await prisma.$transaction(async (tx) => {
			const role = await tx.role.findUnique({
				where: {
					id: args.id,
					NOT: {
						status: "deleted",
					},
				},
				include: {
					_count: {
						select: {
							admins: true,
						},
					},
				},
			});

			if (!role) {
				throw new APIError("Role not found", undefined, undefined, 404);
			}

			if (role.is_super_admin) {
				const activeSuperAdminCount = await tx.role.count({
					where: {
						is_super_admin: true,
						NOT: {
							status: "deleted",
						},
					},
				});

				if (activeSuperAdminCount <= 1) {
					throw new APIError(
						"At least one Super Admin role must exist",
						undefined,
						undefined,
						400,
					);
				}
			}

			if (role._count.admins > 0) {
				throw new APIError(
					"Cannot delete role while its still assigned",
					undefined,
					undefined,
					400,
				);
			}

			return tx.role.update({
				where: {
					id: args.id,
				},
				data: {
					status: "deleted",
				},
			});
		});
	} catch (error: any) {
		if (error instanceof APIError) throw error;
		throw error;
	}
};
