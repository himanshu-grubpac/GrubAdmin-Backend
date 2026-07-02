import { Hono } from "hono";
import { updateStateHandler } from "./handlers/update-state.handler.ts";
import { lockBoxHandler } from "./handlers/lock-box.handler.ts";
import { unlockBoxHandler } from "./handlers/unlock-box.handler.ts";
import { triggerAlertHandler } from "./handlers/trigger-alert.handler.ts";
import { getHealthHandler } from "./handlers/get-health.handler.ts";
import { updateSettingsHandler, createConnectionHandler, deleteConnectionHandler } from "./handlers/mock.handler.ts";

export const simulatorRouter = new Hono();

simulatorRouter.patch("/boxes/:box_id/state", ...updateStateHandler);
simulatorRouter.patch("/boxes/:box_id/lock", ...lockBoxHandler);
simulatorRouter.patch("/boxes/:box_id/unlock", ...unlockBoxHandler);
simulatorRouter.post("/boxes/:box_id/events/trigger-alert", ...triggerAlertHandler);
simulatorRouter.get("/boxes/:box_id/health", ...getHealthHandler);

// Mock endpoints as defined in the spreadsheet
simulatorRouter.patch("/boxes/:box_id/settings", ...updateSettingsHandler);
simulatorRouter.post("/boxes/:box_id/connection", ...createConnectionHandler);
simulatorRouter.delete("/boxes/:box_id/connection", ...deleteConnectionHandler);

