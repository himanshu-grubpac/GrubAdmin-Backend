import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import { resetSimulatorBoxConnection } from "@/db/actions/simulator.connection.actions.ts";

export const resetBoxHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");
		const box = await resetSimulatorBoxConnection(box_id);

		if (!box) {
			return context.json<any>({ status: "error", message: "Box not found" }, { status: 404 });
		}

		return context.json<any>({ status: "success" }, { status: 200 });
	},
);
