import { createDeliveryNotifications } from "@/db/actions/delivery-notification.actions.ts";
import { createDeliveryGrubLockStatusLogs } from "@/db/actions/delivery-system-log.action.ts";
import { logger } from "@/utils/logger.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { lockUnlockGrublockRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
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

  const consumerSuffix = consumer_full_name ? ` by ${consumer_full_name}` : "";

  try {
   await createDeliveryNotifications(
    ids.map((boxId) => ({
     client_id,
     vertical_id,
     box_id: boxId,
     type: "warning",
     title: "Box Locked",
     description: `Box ${boxId} has been locked${consumerSuffix}`,
    })),
   );
  } catch (err) {
   logger.error(`Failed to create lock notifications: ${err}`);
  }

  try {
   await createDeliveryGrubLockStatusLogs({
    client_id,
    vertical_id,
    box_ids: ids,
    actor: {
     id: user_id,
     name: userName || "Unknown",
     role: type,
     table: type === "admin" ? "client" : "vertical_delivery_employee",
    },
    metadata: { action: "lock", recipient: consumer_full_name || undefined },
   });
  } catch (err) {
   logger.error(`Failed to write GrubLock lock audit log: ${err}`);
  }

  return context.json<APIResponse<typeof result>>(response, response.code as any);
 },
);
