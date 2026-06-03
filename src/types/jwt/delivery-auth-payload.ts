import type { VerticalDeliveryEmployeeRoleType } from "../common";

export interface DeliveryAuthPayload {
	id: string;
	role: VerticalDeliveryEmployeeRoleType;
	type?: string;
}

