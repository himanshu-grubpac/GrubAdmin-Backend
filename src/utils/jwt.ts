import { AUTH_SECRET, DELIVERY_AUTH_SECRET, MEDICAL_AUTH_SECRET, JWT_ACCESS_TOKEN_EXPIRY, JWT_REFRESH_TOKEN_EXPIRY } from "@/configs/env";
import { APIError } from "@/types/error";
import type { AuthPayload, DeliveryAuthPayload, MedicalAuthPayload, ImpersonationPayload } from "@/types/jwt";
import { type JwtPayload, sign, verify } from "jsonwebtoken";
import { logger } from "@/utils/logger";
import { randomUUID } from "crypto";

interface JwtAuthPayload extends JwtPayload {
	user?: AuthPayload;
}

interface DeliveryJwtAuthPayload extends JwtPayload {
	user?: DeliveryAuthPayload;
}

interface MedicalJwtAuthPayload extends JwtPayload {
	user?: MedicalAuthPayload;
}

interface JwtImpersonationPayload extends JwtPayload {
	user?: ImpersonationPayload;
}

const IMPERSONATION_TOKEN_EXPIRY = 300; // 5 minutes (short-lived)

export class JWT {
	static verifyAuthToken(token: string): AuthPayload {
		const { user } = verify(token, AUTH_SECRET) as JwtAuthPayload;

		if (!user) {
			throw new APIError("Invalid token", undefined, undefined, 401);
		}

		return user;
	}

	static signAuthToken(payload: AuthPayload): string {
		return sign(
			{
				user: payload,
			},
			AUTH_SECRET,
			{
				expiresIn: JWT_ACCESS_TOKEN_EXPIRY, 
			},
		);
	}

	static verifyDeliveryAuthToken(token: string): DeliveryAuthPayload {
		const { user } = verify(token, DELIVERY_AUTH_SECRET) as DeliveryJwtAuthPayload;

		if (!user) {
			throw new APIError(
				"The auth token is either invalid or has expired!",
				undefined,
				undefined,
				401,
			);
		}

		return user;
	}

	static verifyMedicalAuthToken(token: string): MedicalAuthPayload {
		const { user } = verify(token, MEDICAL_AUTH_SECRET) as MedicalJwtAuthPayload;

		if (!user) {
			throw new APIError(
				"The auth token is either invalid or has expired!",
				undefined,
				undefined,
				401,
			);
		}

		return user;
	}

	static signMedicalAuthToken(payload: MedicalAuthPayload): string {
		return sign(
			{
				user: payload,
			},
			MEDICAL_AUTH_SECRET,
			{
				expiresIn: "24h",
			},
		);
	}

	static signDeliveryAuthToken(payload: DeliveryAuthPayload): string {
		return sign(
			{
				user: payload,
			},
			DELIVERY_AUTH_SECRET,
			{
				expiresIn: "24h",
			},
		);
	}

	static signImpersonationToken(payload: ImpersonationPayload): string {
		return sign(
			{
				user: payload,
				jti: randomUUID(),
				aud: "grubDelivery",
			},
			DELIVERY_AUTH_SECRET,
			{
				expiresIn: IMPERSONATION_TOKEN_EXPIRY,
			},
		);
	}

	static verifyImpersonationToken(token: string): ImpersonationPayload {
		try {
			const decoded = verify(token, DELIVERY_AUTH_SECRET) as JwtImpersonationPayload;
			const user = decoded?.user;

			if (!user) {
				throw new APIError("Invalid impersonation token", undefined, undefined, 401);
			}

			if (user.role !== "impersonation") {
				throw new APIError("Invalid token type", undefined, undefined, 401);
			}

			return user;
		} catch (err) {
			if (err instanceof APIError) throw err;
			throw new APIError("Invalid or expired impersonation token", undefined, undefined, 401);
		}
	}

	static isImpersonationToken(token: string): boolean {
		try {
			const decoded = verify(token, DELIVERY_AUTH_SECRET, { ignoreExpiration: false }) as JwtImpersonationPayload;
			return decoded?.user?.role === "impersonation";
		} catch {
			return false;
		}
	}

	static signDeliveryRefreshToken(payload: DeliveryAuthPayload): string {
		return sign(
			{
				user: payload,
			},
			DELIVERY_AUTH_SECRET,
			{
				expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
			},
		);
	}

	static verifyDeliveryRefreshToken(token: string): DeliveryAuthPayload {
		const { user } = verify(token, DELIVERY_AUTH_SECRET) as DeliveryJwtAuthPayload;

		if (!user) {
			throw new APIError(
				"The refresh token is either invalid or has expired!",
				undefined,
				undefined,
				401,
			);
		}

		return user;
	}
}
