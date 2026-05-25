import { AUTH_SECRET, FOOD_AUTH_SECRET, JWT_ACCESS_TOKEN_EXPIRY, JWT_REFRESH_TOKEN_EXPIRY } from "@/configs/env";
import { APIError } from "@/types/error";
import type { AuthPayload, FoodAuthPayload, ImpersonationPayload } from "@/types/jwt";
import { type JwtPayload, sign, verify } from "jsonwebtoken";
import { logger } from "@/utils/logger";

interface JwtAuthPayload extends JwtPayload {
	user?: AuthPayload;
}

interface FoodJwtAuthPayload extends JwtPayload {
	user?: FoodAuthPayload;
}

interface JwtImpersonationPayload extends JwtPayload {
	user?: ImpersonationPayload;
}




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

	static verifyFoodAuthToken(token: string): FoodAuthPayload {
		const { user } = verify(token, FOOD_AUTH_SECRET) as FoodJwtAuthPayload;

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

	static signFoodAuthToken(payload: FoodAuthPayload): string {
		return sign(
			{
				user: payload,
			},
			FOOD_AUTH_SECRET,  // Separate secret from admin AUTH_SECRET
			{
				expiresIn: "24h",
			},
		);
	}
}
