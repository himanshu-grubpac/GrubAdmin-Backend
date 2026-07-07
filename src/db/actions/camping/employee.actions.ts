import type { client } from "@/db/types";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { CampingEmployeeRoleType } from "@/types/common";
import { logger } from "@/utils/logger";

interface GetUniqueCampingEmployeeArgs {
	email?: string;
	phone?: string;
	id?: string;
}

export type GetUniqueCampingEmployeeResponse =
	| ({
		type: "admin";
	} & {
		employee: client;
	})
	| null;

export const getUniqueCampingEmployee = async (
	args: GetUniqueCampingEmployeeArgs,
): Promise<GetUniqueCampingEmployeeResponse> => {
	const { id, email, phone } = args;

	const orConditions = [
		email ? { email: email } : {},
		phone ? { mobile_number: phone } : {},
	].filter((condition) => Object.keys(condition).length > 0);

	const clientWhere: any = {};
	if (id) clientWhere.id = id;
	if (orConditions.length > 0) clientWhere.OR = orConditions;

	const clientRecord = Object.keys(clientWhere).length > 0
		? await prisma.client.findFirst({ where: clientWhere })
		: null;

	if (clientRecord) {
		return {
			type: "admin",
			employee: clientRecord,
		};
	}

	logger.warn(`[Auth] getUniqueCampingEmployee returned null`, {
		email,
		id,
		phone,
	});

	return null;
};
