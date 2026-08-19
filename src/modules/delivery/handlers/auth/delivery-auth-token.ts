import { prisma } from "@/db";
import type { VerticalDeliveryEmployeeRoleType } from "@/types/common";
import type { DeliveryAuthPayload } from "@/types/jwt/delivery-auth-payload";
import { JWT } from "@/utils/jwt.ts";
import type { SignOptions } from "jsonwebtoken";

export const invalidateDeliveryAuthSessions = async (clientId: string) => {
	return prisma.client.update({
		where: { id: clientId },
		data: { auth_token_version: { increment: 1 } },
		select: { auth_token_version: true },
	});
};

export const signDeliverySessionToken = async (
	clientId: string,
	payload: Omit<DeliveryAuthPayload, "token_version">,
	expiresIn?: SignOptions["expiresIn"],
) => {
	const client = await prisma.client.findUnique({
		where: { id: clientId },
		select: { auth_token_version: true },
	});

	return JWT.signDeliveryAuthToken(
		{
			...payload,
			token_version: client?.auth_token_version ?? 0,
		},
		expiresIn,
	);
};

export const signDeliverySessionRefreshToken = async (
	clientId: string,
	payload: Omit<DeliveryAuthPayload, "token_version">,
) => {
	const client = await prisma.client.findUnique({
		where: { id: clientId },
		select: { auth_token_version: true },
	});

	return JWT.signDeliveryRefreshToken({
		...payload,
		token_version: client?.auth_token_version ?? 0,
	});
};
