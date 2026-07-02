import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { emergencyUnlockGrublockRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const emergencyUnlockGrublockHandler = createHandlers(
 deliveryAuthGuard(["admin", "manager"]),
 emergencyUnlockGrublockRequestBodyValidator,
 async (context) => {
  const { client_id, user_id, user, type, vertical_id } = context.var;
  const { ids, reason } = context.req.valid("json");

  const userObj = user as any;
  const userName = type === "admin"
   ? userObj.name
   : `${userObj.first_name} ${userObj.last_name || ""}`.trim();

  const result = await updateBoxLockStatus({
   ids,
   lock_status: "unlocked",
   user: {
    id: user_id,
    email: userObj.email || "",
    name: userName || "Unknown",
   },
   reason,
   client_id,
  });

  const templatePath = ids.length > 1 
   ? "delivery.box.unlock.BULK_REQUEST_SENT" 
   : "delivery.box.unlock.REQUEST_SENT";

  const response = {
   success: true as const,
   ...resolveMessageTemplate(templatePath, { id: ids[0] }),
   message: "Boxes emergency unlocked successfully",
   data: result,
  };

  // Create notification for each emergency unlocked box
  try {
   for (const boxId of ids) {
    await createNotification({
     client_id,
     vertical_id,
     box_id: boxId,
     type: "warning",
     title: "Emergency Unlock",
     description: `Box ${boxId} has been emergency unlocked${reason ? ` (Reason: ${reason})` : ""}`,
    });
   }
  } catch (err) {
   console.error("Failed to create emergency unlock notification:", err);
  }

  // Start auto-injected log
  try {
   const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
   for (const id of subjects) {
    await loggerService.log({
     category: "GrubLock",
     type: "Emergency unlock",
     actor: { 
      id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
      name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
      role: "admin", 
      table: "client" 
     },
     client_id: context.var.client_id,
     subject: { id: id, name: id, type: "box" },
     metadata: {  }
    });
   }
  } catch (err) { }
  // End auto-injected log

  return context.json<APIResponse<typeof result>>(response, response.code as any);
 },
);
