import { prisma } from "@/db";
import type { HospitalityEmployeeRoleType } from "@/types/common";
import type { HospitalityAuthPayload } from "@/types/jwt/hospitality-auth-payload";
import { JWT } from "@/utils/jwt.ts";

export const invalidateHospitalityAuthSessions = async (clientId: string) => {
	return prisma.client.update({
		where: { id: clientId },
		data: { auth_token_version: { increment: 1 } },
		select: { auth_token_version: true },
	});
};

export const signHospitalitySessionToken = async (
	clientId: string,
	role: HospitalityEmployeeRoleType,
	extra?: Partial<Omit<HospitalityAuthPayload, "id" | "role">>,
) => {
	const client = await prisma.client.findUnique({
		where: { id: clientId },
		select: { auth_token_version: true },
	});

	return JWT.signHospitalityAuthToken({
		id: clientId,
		role,
		token_version: client?.auth_token_version ?? 0,
		...extra,
	});
};
