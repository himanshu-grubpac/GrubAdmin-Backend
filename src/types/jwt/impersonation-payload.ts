import type { JwtPayload } from "jsonwebtoken";

export interface ImpersonationPayload {
	id: string;
	role: "impersonation";
	admin_id: string;
	client_id: string;
	is_impersonation: true;
	admin_role: "admin" | "employee";
}

export interface JwtImpersonationPayload extends JwtPayload {
	user?: ImpersonationPayload;
}
