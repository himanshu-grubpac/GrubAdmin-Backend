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

/**
 * Normalize and validate an enum-like string field.
 * - Case-insensitive (lowercases the input)
 * - Maps common aliases (e.g. "inactive" -> "suspended", "good" -> "healthy")
 * - Returns the normalized value or throws a descriptive APIError
 */
const VALID_STATUS = ["active", "suspended"] as const;
const VALID_HARDWARE_STATE = ["on", "off", "unknown"] as const;
const VALID_HEALTH_STATUS = ["healthy", "critical", "attention"] as const;

const STATUS_ALIASES: Record<string, string> = {
	inactive: "suspended",
};

const HEALTH_ALIASES: Record<string, string> = {
	good: "healthy",
};

function normalizeStatus(
	val: unknown,
	fieldName: string,
	allowed: readonly string[],
	aliases: Record<string, string> = {},
	defaultVal?: string,
): string | null {
	if (val === undefined || val === null) {
		if (defaultVal !== undefined) return defaultVal;
		return null;
	}
	const str = String(val).toLowerCase().trim();
	const mapped = aliases[str] ?? str;
	if ((allowed as readonly string[]).includes(mapped)) return mapped;
	const allowedStr = allowed.map((v) => `'${v}'`).join(", ");
	const aliasStr = Object.keys(aliases).length
		? ` (or ${Object.keys(aliases).map((v) => `'${v}'`).join(", ")})`
		: "";
	throw new APIError(
		`${fieldName} must be one of ${allowedStr}${aliasStr}, got '${String(val)}'`,
		undefined,
		undefined,
		400,
	);
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

		const body = context.req.valid("json");

		const {
			box_id,
			name,
			vertical,
			vehicle_number,
		} = body;

		const status = normalizeStatus(body.status, "Status", VALID_STATUS, STATUS_ALIASES, "active") as box_status;
		const power_status = normalizeStatus(body.power_status, "Power status", VALID_HARDWARE_STATE) as hardware_state;
		const ioniser_status = normalizeStatus(body.ioniser_status, "Ioniser status", VALID_HARDWARE_STATE) as hardware_state;
		const health_status = normalizeStatus(body.health_status, "Health status", VALID_HEALTH_STATUS, HEALTH_ALIASES) as box_health_status;
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
