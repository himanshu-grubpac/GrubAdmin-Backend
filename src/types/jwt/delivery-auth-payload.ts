import type { VerticalDeliveryEmployeeRoleType } from "../common";

export interface DeliveryAuthPayload {
	id: string;
	role: VerticalDeliveryEmployeeRoleType;
	type?: string;
	token_version?: number;
}

