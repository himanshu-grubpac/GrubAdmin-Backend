import type { VerticalFoodEmployeeRoleType } from "../common";

export interface FoodAuthPayload {
	id: string;
	role: VerticalFoodEmployeeRoleType;
	type?: string;
}

