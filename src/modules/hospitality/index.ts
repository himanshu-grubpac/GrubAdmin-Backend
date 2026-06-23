import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { reqInputsMiddleware } from "@/middlewares/req-inputs";
import {
	createFloorHandler,
	getFloorsHandler,
	getFloorByIdHandler,
	editFloorHandler,
	deleteFloorsHandler,
	suspendFloorsHandler,
	reactivateFloorsHandler,
	searchFloorsHandler,
} from "hospitality/handlers/floor";

export const hospitalityRouter = new Hono();

hospitalityRouter.onError(globalErrorHandler);
hospitalityRouter.use(reqInputsMiddleware);

hospitalityRouter.post("/floor", ...createFloorHandler);
hospitalityRouter.get("/floor", ...getFloorsHandler);
hospitalityRouter.get("/floor/details", ...getFloorByIdHandler);
hospitalityRouter.put("/floor", ...editFloorHandler);
hospitalityRouter.delete("/floor", ...deleteFloorsHandler);
hospitalityRouter.patch("/floor/suspend", ...suspendFloorsHandler);
hospitalityRouter.patch("/floor/reactivate", ...reactivateFloorsHandler);
hospitalityRouter.get("/floor/search", ...searchFloorsHandler);
