import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { lockUnlockGrublockRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const lockGrublockHandler = createHandlers(
 deliveryAuthGuard(["admin", "manager"]),
 lockUnlockGrublockRequestBodyValidator,
 async (context) => {
  const { client_id, user_id, user, type, vertical_id } = context.var;
  const { ids, consumer_full_name, consumer_country_code, consumer_phone } =
   context.req.valid("json");

  const userObj = user as any;
  const userName = type === "admin"
   ? userObj.name
   : `${userObj.first_name} ${userObj.last_name || ""}`.trim();

  const result = await updateBoxLockStatus({
   ids,
   lock_status: "locked",
   user: {
    id: user_id,
    email: userObj.email || "",
    name: userName || "Unknown",
   },
   client_id,
   consumer: consumer_full_name
    ? {
      full_name: consumer_full_name,
      country_code: consumer_country_code || "",
      phone: consumer_phone || "",
     }
    : undefined,
  });

  const mobile = consumer_phone ? `${consumer_country_code || ""} ${consumer_phone}`.trim() : "your registered phone";

  const response = {
   success: true as const,
   ...resolveMessageTemplate("delivery.box.SECURED", { id: ids[0], mobile }),
   message: "Boxes locked successfully",
   data: result,
  };

  // Create notification for each locked box
  try {
   for (const boxId of ids) {
    await createNotification({
     client_id,
     vertical_id,
     box_id: boxId,
     type: "warning",
     title: "Box Locked",
     description: `Box ${boxId} has been locked${consumer_full_name ? ` by ${consumer_full_name}` : ""}`,
    });
   }
  } catch (err) {
   console.error("Failed to create lock notification:", err);
  }

  // Start auto-injected log
  try {
   const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
   for (const id of subjects) {
    await loggerService.log({
     category: "GrubLock",
     type: "Status",
     actor: { 
      id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
      name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
      role: "admin", 
      table: "client" 
     },
     client_id: context.var.client_id,
     subject: { id: id, name: id, type: "box" },
     metadata: { action: "lock" }
    });
   }
  } catch (err) { }
  // End auto-injected log

  return context.json<APIResponse<typeof result>>(response, response.code as any);
 },
);
