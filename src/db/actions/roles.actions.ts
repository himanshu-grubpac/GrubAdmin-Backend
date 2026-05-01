import { prisma } from "@/db";
import { type Prisma, type role } from "@/db/types";
import { APIError } from "@/types/error";

interface CreateRoleArgs {
	name: string;
	permissions: Record<string, string[]>;
	isSuperAdmin?: boolean;
}

export const createRole = async (args: CreateRoleArgs) => {
	return prisma.role.create({
		data: {
			name: args.name,
			permissions_json: args.permissions,
			is_super_admin: args.isSuperAdmin,
		},
	});
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
	permissions?: Record<string, string[]>;
	isSuperAdmin?: boolean;
}

export const updateRole = async (args: UpdateRoleArgs) => {
	return prisma.role.update({
		where: {
			id: args.id,
			NOT: {
				status: "deleted",
			},
		},
		data: {
			name: args.name,
			permissions_json: args.permissions,
			is_super_admin: args.isSuperAdmin,
		},
	});
};

interface DeleteRoleArgs {
	id: string;
}

export const deleteRole = async (args: DeleteRoleArgs) => {
	const role = await prisma.role.findUnique({
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

	if (role._count.admins > 0) {
		throw new APIError("Cannot delete role while its still assigned", undefined, undefined, 400);
	}

	return prisma.role.update({
		where: {
			id: args.id,
			NOT: {
				status: "deleted",
			},
		},
		data: {
			status: "deleted",
		},
	});
};
