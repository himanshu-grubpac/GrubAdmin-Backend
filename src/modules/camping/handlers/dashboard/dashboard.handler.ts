import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { prisma } from "@/db";
import { CampingClientLocation } from "@/db/mongo-schema";

interface DashboardBoxData {
	id: string;
	name: string;
	box_display_id: string;
	connection_status: string | null;
	camera_status: string | null;
	battery_percentage: number | null;
	charging_status: string | null;
}

interface DashboardData {
	greeting: string;
	user_name: string;
	total_boxes: number;
	connected_boxes: number;
	has_password_set: boolean;
	outside_temperature: number | null;
	location: {
		latitude: number;
		longitude: number;
		address: string;
	} | null;
	boxes: DashboardBoxData[];
}

export const getDashboardHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");
		const user = context.get("user");
		const vertical_id = context.get("vertical_id");

		const currentHour = new Date().getHours();
		let greeting = "Good evening";
		if (currentHour < 12) greeting = "Good morning";
		else if (currentHour < 17) greeting = "Good afternoon";

		const boxWhere = { client_id, vertical_id, status: { not: "unassigned" } as const };

		const client = prisma.client.findUnique({
			where: { id: client_id },
		});

		const totalBoxes = prisma.box.count({ where: boxWhere });

		const connectedBoxes = prisma.box.count({
			where: {
				...boxWhere,
				telemetry: { connection_status: "connected" },
			},
		});

		const boxes = prisma.box.findMany({
			where: boxWhere,
			select: {
				id: true,
				name: true,
				box_display_id: true,
				telemetry: {
					select: {
						connection_status: true,
						camera_status: true,
						battery_percentage: true,
						charging_status: true,
						ext_temp: true,
					},
				},
			},
			orderBy: { created_at: "asc" },
		});

		const location = CampingClientLocation.findOne({ client_id }).lean();

		const [clientResult, totalBoxesResult, connectedBoxesResult, boxesResult, locationResult] =
			await Promise.all([client, totalBoxes, connectedBoxes, boxes, location]);

		const validTemps = boxesResult
			.map((b) => b.telemetry?.ext_temp)
			.filter((t): t is number => t !== null && t !== undefined);

		const outside_temperature = validTemps.length > 0
			? Math.round(validTemps.reduce((sum, t) => sum + t, 0) / validTemps.length)
			: null;

		const dashboardBoxes: DashboardBoxData[] = boxesResult.map((b) => ({
			id: b.id,
			name: b.name || b.box_display_id,
			box_display_id: b.box_display_id,
			connection_status: b.telemetry?.connection_status ?? null,
			camera_status: b.telemetry?.camera_status ?? null,
			battery_percentage: b.telemetry?.battery_percentage ?? null,
			charging_status: b.telemetry?.charging_status ?? null,
		}));

		return context.json({
			success: true,
			code: 200,
			data: {
				greeting,
				user_name: clientResult?.name || user?.name || "",
				total_boxes: totalBoxesResult,
				connected_boxes: connectedBoxesResult,
				has_password_set: !!clientResult?.password,
				outside_temperature,
				location: locationResult
					? {
						latitude: locationResult.latitude,
						longitude: locationResult.longitude,
						address: locationResult.address || "",
					}
					: null,
				boxes: dashboardBoxes,
			},
		} as any);
	},
);

const updateLocationValidator = zValidator(
	"json",
	z.object({
		latitude: z.number().min(-90).max(90),
		longitude: z.number().min(-180).max(180),
		address: z.string().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateLocationHandler = createHandlers(
	campingAuthGuard(),
	updateLocationValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { latitude, longitude, address } = context.req.valid("json");

		await CampingClientLocation.findOneAndUpdate(
			{ client_id },
			{ client_id, latitude, longitude, address: address || "" },
			{ upsert: true, new: true },
		);

		return context.json({
			success: true,
			code: 200,
			message: "Location updated successfully",
			data: { latitude, longitude, address: address || "" },
		} as any);
	},
);
