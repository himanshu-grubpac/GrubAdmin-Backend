import { Hono } from "hono";
import { updateStateHandler } from "./handlers/update-state.handler.ts";
import { lockBoxHandler } from "./handlers/lock-box.handler.ts";
import { unlockBoxHandler } from "./handlers/unlock-box.handler.ts";
import { triggerAlertHandler } from "./handlers/trigger-alert.handler.ts";
import { getHealthHandler } from "./handlers/get-health.handler.ts";
import { updateSettingsHandler, createConnectionHandler, deleteConnectionHandler } from "./handlers/driver-controls.handler.ts";
import { getBoxByDisplayIdHandler } from "./handlers/get-box-by-display-id.handler.ts";
import { resetBoxHandler } from "./handlers/reset-box.handler.ts";
import { runSimulatorHeartbeatSweep } from "@/db/actions/simulator.connection.actions.ts";

export const simulatorRouter = new Hono();

simulatorRouter.patch("/boxes/:box_id/state", ...updateStateHandler);
simulatorRouter.patch("/boxes/:box_id/lock", ...lockBoxHandler);
simulatorRouter.patch("/boxes/:box_id/unlock", ...unlockBoxHandler);
simulatorRouter.post("/boxes/:box_id/events/trigger-alert", ...triggerAlertHandler);
simulatorRouter.get("/boxes/:box_id/health", ...getHealthHandler);

simulatorRouter.get("/boxes/display/:display_id", ...getBoxByDisplayIdHandler);

simulatorRouter.patch("/boxes/:box_id/settings", ...updateSettingsHandler);
simulatorRouter.post("/boxes/:box_id/connection", ...createConnectionHandler);
simulatorRouter.delete("/boxes/:box_id/connection", ...deleteConnectionHandler);
simulatorRouter.delete("/boxes/:box_id/reset-box", ...resetBoxHandler);

setInterval(() => {
	runSimulatorHeartbeatSweep().catch((err) => {
		console.error("Simulator heartbeat sweep failed:", err);
	});
}, 5_000);
