import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createBoxRequestBodyValidator } from "@/modules/admin/validators/box.validators.ts";
import type {
	box,
	hardware_state,
	box_health_status,
	box_status,
} from "@/db/types";
import { createBox } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { APIError } from "@/types/error";
import { Permission } from "@/utils/permission.ts";
import { GRUBPACS_PERMISSIONS } from "@/configs/constants.ts";
import { Prisma } from "@/db/types";

interface ResponseData {
	box: box;
}

const enumValues = {
	hardware_state: ["on", "off", "unknown"] as const,
	box_health_status: ["healthy", "critical", "attention"] as const,
	box_status: ["active", "suspended"] as const,
};

const normalizeEnum = <T extends string>(
	val: unknown,
	allowed: readonly T[],
	defaultVal?: T,
): T | null | undefined => {
	if (val === undefined || val === null) return val ?? null ?? undefined;
	const str = String(val).toLowerCase() as T;
	return allowed.includes(str) ? str : defaultVal;
};

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

		const body = context.req.valid("json");

		const {
			box_id,
			name,
			vertical,
			vehicle_number,
		} = body;

		const status = normalizeEnum(body.status, enumValues.box_status, "active") as box_status;
		const power_status = normalizeEnum(body.power_status, enumValues.hardware_state) as hardware_state | null | undefined;
		const health_status = normalizeEnum(body.health_status, enumValues.box_health_status) as box_health_status | null | undefined;
		const ioniser_status = normalizeEnum(body.ioniser_status, enumValues.hardware_state) as hardware_state | null | undefined;
		const battery_percentage = body.battery_percentage;

		const verticalData = await getVertical(vertical);
		if (!verticalData) {
			throw new APIError("Vertical not found", undefined, undefined, 400);
		}

		let box: box;
		try {
			box = await createBox({
				box_display_id: box_id,
				name,
				vertical_id: vertical,
				vehicle_number: vehicle_number ?? null,
				status,
				power_status: power_status ?? null,
				health_status: health_status ?? null,
				ioniser_status: ioniser_status ?? null,
				battery_percentage: battery_percentage ?? null,
			});
		} catch (error: any) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2002") {
					const target = (error.meta?.target as string[])?.join(", ") ?? "field";
					throw new APIError(
						`A box with this ${target} already exists`,
						undefined,
						undefined,
						409,
					);
				}
			}
			throw error;
		}

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
