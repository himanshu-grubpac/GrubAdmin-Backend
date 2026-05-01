import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { deleteSuspendedRestaurants } from "@/db/actions/restaurant.actions";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const bodyValidator = zValidator(
    "json",
    z.object({
        ids: z.ulid("Please provide a valid restaurant id").array().min(1, "Please provide at least one id"),
    }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const deleteSuspendedRestaurantsHandler = createHandlers(
    foodAuthGuard(["admin"]),
    bodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const { ids } = context.req.valid("json");

        const result = await deleteSuspendedRestaurants({ ids, client_id });

        return context.json<APIResponse<{ deleted_count: number }>>(
            { success: true, code: 200, data: { deleted_count: result.count } },
            { status: 200 },
        );
    },
);
