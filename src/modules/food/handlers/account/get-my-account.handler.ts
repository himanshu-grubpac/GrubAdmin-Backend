import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import type { client, vertical_food_employee } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

interface ResponseData {
	employee: Record<string, any>;
	role: string;
	id: string;
	client_id: string;
}

export const getMyAccountHandler = createHandlers(
	foodAuthGuard(),
	async (context) => {
		const { type, user, client_id } = context.var;

		let employee: Record<string, any> = {
			...user,
			is_password_set: !!user.password,
			password: undefined, // never expose password
		};

		if (type === "admin") {
			const fullName = ((user as client).name || "").trim();
			const spaceIdx = fullName.indexOf(" ");
			employee.full_name = fullName;
			employee.first_name = spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx).trim();
			employee.last_name = spaceIdx === -1 ? "" : fullName.slice(spaceIdx + 1).trim();
			delete employee.name; // remove raw client.name from spread
			employee.client_id = (user as any).client_display_id;
			employee.organization_name = (user as client).organization_name || null;
			employee.restaurant_id = null;
			employee.restaurant_name = null;
		} else {
			const emp = user as vertical_food_employee;
			const first = emp.first_name || "";
			const last = emp.last_name || "";
			// Keep all three name fields in response
			employee.first_name = first;
			employee.last_name = last;
			employee.full_name = [first, last].filter(Boolean).join(" ");
			employee.employee_id = (emp as any).employee_display_id;
			employee.client_id = emp.client_id;

			// Fetch organization_name from parent client via client_id
			const clientRecord = await prisma.client.findUnique({
				where: { id: emp.client_id as string },
				select: { organization_name: true },
			});
			employee.organization_name = clientRecord?.organization_name || null;

			// Fetch restaurant details if assigned
			if (emp.restaurant_id) {
				const restaurant = await prisma.restaurant.findUnique({
					where: { id: emp.restaurant_id },
					select: { id: true, name: true },
				});
				employee.restaurant_id = restaurant?.id || null;
				employee.restaurant_name = restaurant?.name || null;
			} else {
				employee.restaurant_id = null;
				employee.restaurant_name = null;
			}
		}

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					employee,
					role: type === "admin" ? "admin" : "employee",
					id: user.id,
					client_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);

