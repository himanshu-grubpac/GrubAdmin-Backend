import type { JwtPayload } from "jsonwebtoken";

export interface ImpersonationTokenPayload {
	type: "impersonation";
	admin_id: string;
	admin_name: string;
	customer_id: string;
	customer_name: string;
	customer_email: string | null;
	delivery_user_id: string;
	vertical_name: string | null;
	aud: "grubDelivery";
	jti: string;
}

export interface ImpersonationPayload {
	id: string;
	role: "impersonation";
	admin_id: string;
	client_id: string;
	is_impersonation: true;
	admin_role: "admin" | "employee";
	vertical_name?: string | null;
	client_name?: string | null;
	return_url?: string | null;
	aud?: string;
	jti?: string;
}

export interface JwtImpersonationPayload extends JwtPayload {
	user?: ImpersonationPayload;
}
