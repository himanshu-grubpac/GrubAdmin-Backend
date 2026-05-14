import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createBoxRequestBodyValidator } from "@/modules/admin/validators/box.validators.ts";
import type { 
	box,
	hardware_state,
	box_health_status,
} from "@/db/types";
import { createBox } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { APIError } from "@/types/error";
import { Permission } from "@/utils/permission.ts";
import { GRUBPACS_PERMISSIONS } from "@/configs/constants.ts";

interface ResponseData {
	box: box;
}

export const createBoxHandler = createHandlers(
	authGuard(["admin", "employee"]),
	createBoxRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				grubpac: [GRUBPACS_PERMISSIONS.add_grubpacs],
			},
		});

		const {
			box_id,
			name,
			vertical,
			vehicle_number,
			status,
			power_status,
			health_status,
			ioniser_status,
			battery_percentage,
		} = context.req.valid("json");

		const verticalData = await getVertical(vertical);
		if (!verticalData) {
			throw new APIError("Invalid vertical selected", undefined, undefined, 400);
		}

		const box = await createBox({
			box_display_id: box_id,
			name,
			vertical_id: vertical,
			vehicle_number,
			status,
			power_status: power_status as hardware_state,
			health_status: health_status as box_health_status,
			ioniser_status: ioniser_status as hardware_state,
			battery_percentage,
		});

		services.adminLogger.log({
			module: "grubpac",
			action: "create",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
			effected_id: box.id,
			effected_name: box.name ?? undefined,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					box: {
						...box,
						box_id: (box as any).box_display_id,
					} as any,
				},
			},
			{
				status: 200,
			},
		);
	},
);
