import { loggerService } from "@/services/system-log.ts";
import { logger } from "@/utils/logger.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { emergencyUnlockGrublockRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { resolveMessageTemplate } from "@/utils/message";
import { prisma } from "@/db";

export const emergencyUnlockGrublockHandler = createHandlers(
 deliveryAuthGuard(["admin", "manager"]),
 emergencyUnlockGrublockRequestBodyValidator,
 async (context) => {
  const { client_id, user_id, user, type, vertical_id } = context.var;
  const { ids, reason } = context.req.valid("json");

  const alreadyUnlocked = await prisma.box_lock.findMany({
    where: {
      box_id: { in: ids },
      lock_status: "unlocked",
    },
    select: { box_id: true },
  });

  if (alreadyUnlocked.length === ids.length) {
    throw new APIError(
      "Selected box(es) are already unlocked.",
      "delivery.box.ALREADY_UNLOCKED",
      undefined,
      400,
    );
  }

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
   const boxes = await prisma.box.findMany({
    where: { id: { in: ids }, client_id },
    select: {
     id: true,
     name: true,
     box_display_id: true,
     restaurant_boxes: {
      take: 1,
      select: { restaurant: { select: { name: true } } },
     },
    },
   });
   const byId = new Map(boxes.map((b) => [b.id, b]));

   for (const boxId of ids) {
    const box = byId.get(boxId);
    const label = box?.box_display_id || box?.name || "Unknown";
    await createNotification({
     client_id,
     vertical_id,
     box_id: boxId,
     box_display_id: box?.box_display_id,
     box_name: box?.name ?? undefined,
     restaurant_name: box?.restaurant_boxes[0]?.restaurant?.name,
     type: "warning",
     title: "Emergency Unlock",
     description: `Box ${label} has been emergency unlocked${reason ? ` (Reason: ${reason})` : ""}`,
    });
   }
  } catch (err) {
   console.error("Failed to create emergency unlock notification:", err);
  }

  // Audit log
  try {
   for (const id of ids) {
    await loggerService.log({
     category: "GrubLock",
     type: "Emergency unlock",
     actor: {
      id: user_id,
      name: userName || "Unknown",
      role: type,
      table: type === "admin" ? "client" : "vertical_delivery_employee",
     },
     client_id,
     subject: { id: id, name: id, type: "box" },
     metadata: { reason: reason || undefined }
    });
   }
  } catch (err) {
   logger.error(`Failed to write GrubLock emergency-unlock audit log: ${err}`);
  }

  return context.json<APIResponse<typeof result>>(response, response.code as any);
 },
);
