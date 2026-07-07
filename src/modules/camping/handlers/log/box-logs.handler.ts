import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
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
		const { page, page_size } = context.req.valid("query");

		const box = await prisma.box.findFirst({
			where: { id: box_id, client_id },
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		return context.json<APIResponse<{ message: string }>>({
			success: true,
			code: 200,
			data: { message: "Logs endpoint placeholder - integrate with system-log service" },
		});
	},
);
