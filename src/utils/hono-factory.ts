import { createFactory } from "hono/factory";
import type { UserType } from "@/types/common";
import type { admin, role } from "@/db/types";

export type AppEnv = {
	Variables: {
		user_id: string;
		type: UserType;
		admin?: admin;
		role?: role | null;
		ip?: string;
	};
};

const { createHandlers, createMiddleware } = createFactory<AppEnv>();

export { createMiddleware, createHandlers };
