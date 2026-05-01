import type { UserType } from "../common";

export interface AuthPayload {
	id: string;
	role: UserType;
}
