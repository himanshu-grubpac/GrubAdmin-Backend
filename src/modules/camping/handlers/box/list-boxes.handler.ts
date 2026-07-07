import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { getCampingBoxes } from "@/db/actions/camping/box.actions";
import type { APIResponse } from "@/types/api";

export const listBoxesHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");

		const page = parseInt(context.req.query("page") || "1", 10) || 1;
		const page_size = parseInt(context.req.query("page_size") || "40", 10) || 40;

		const { boxes, total } = await getCampingBoxes({
			client_id,
			vertical_id,
			page,
			page_size,
		});

		const formattedBoxes = boxes.map((box) => ({
			id: box.id,
			box_display_id: box.box_display_id,
			name: box.name || "",
			is_connected: box.telemetry?.connection_status === "connected",
			battery_level: box.telemetry?.battery_percentage ?? 0,
			is_locked: box.lock?.lock_status === "locked",
		}));

		return context.json<APIResponse<{ boxes: typeof formattedBoxes; total: number; page: number; page_size: number }>>({
			success: true,
			code: 200,
			data: {
				boxes: formattedBoxes,
				total,
				page,
				page_size,
			},
		});
	},
);
