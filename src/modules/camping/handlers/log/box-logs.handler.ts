import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import { getSystemLogs } from "@/db/actions/system-log.action";
import { calculatePagination } from "@/utils/pagination";
import type { APIResponse } from "@/types/api";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { validatorErrorHandler } from "@/utils/zod.ts";

const getBoxLogsQueryValidator = zValidator(
	"query",
	z.object({
		page: z.coerce.number().int().min(1).optional().default(1),
		page_size: z.coerce.number().int().min(1).max(100).optional().default(40),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getBoxLogsHandler = createHandlers(
	campingAuthGuard(),
	getBoxLogsQueryValidator,
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");
		const { page, page_size } = context.req.valid("query");

		const box = await prisma.box.findFirst({
			where: { id: box_id, client_id, vertical_id },
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const result = await getSystemLogs({
			client_id,
			subject_id: box.id,
			category: "GrubPac",
			page,
			page_size,
		});

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Box logs fetched successfully",
			data: {
				logs: result.logs,
				count: result.page_count,
				total: result.total_count,
			},
			pagination: calculatePagination(
				result.page || 1,
				result.page_size || result.total_count,
				result.total_count,
			),
		});
	},
);
