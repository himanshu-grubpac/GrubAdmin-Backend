import { loggerService } from "@/services/system-log.ts";
import { logger } from "@/utils/logger.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { verifyUnlockGrublockRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { APIError } from "@/types/error";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import {
 compareOtp,
 deleteSavedDeliveryEmployeeOtp,
 getSavedDeliveryEmployeeOtp,
} from "@/db/actions/delivery-employee-otp.actions";
import { prisma } from "@/db";

export const verifyUnlockGrublockHandler = createHandlers(
 deliveryAuthGuard(["admin", "manager"]),
 verifyUnlockGrublockRequestBodyValidator,
 async (context) => {
  const { client_id, user_id, user, type, vertical_id } = context.var;
  const { otp_id, otp } = context.req.valid("json");

  const userObj = user as any;

  const savedOtp = await getSavedDeliveryEmployeeOtp(userObj.email, otp_id);
  if (!savedOtp) {
   throw new APIError("OTP expired or invalid", undefined, undefined, 400);
  }
  const otpValid = await compareOtp(otp, savedOtp.otp);
  if (!otpValid) {
   throw new APIError("Incorrect OTP", undefined, undefined, 400);
  }
  if (savedOtp.for_what !== "unlock_box") {
   throw new APIError("Invalid OTP purpose", undefined, undefined, 400);
  }

  const { ids } = savedOtp.metadata as any;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
   throw new APIError("Invalid session metadata", undefined, undefined, 400);
  }

  const result = await updateBoxLockStatus({
   ids,
   lock_status: "unlocked",
   user: {
    id: user_id,
    email: userObj.email || "",
    name: userObj.name || `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() || "Unknown",
   },
   client_id,
  });

  await deleteSavedDeliveryEmployeeOtp(userObj.email);

  // Create notification for each verified unlock
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
     type: "success",
     title: "Box Unlocked",
     description: `Box ${label} has been unlocked successfully`,
    });
   }
  } catch (err) {
   console.error("Failed to create unlock notification:", err);
  }

  // Audit log
  try {
   const actorName = type === "admin"
    ? userObj.name
    : `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim();
   for (const id of ids) {
    await loggerService.log({
     category: "GrubLock",
     type: "OTP",
     actor: {
      id: user_id,
      name: actorName || "Unknown",
      role: type,
      table: type === "admin" ? "client" : "vertical_delivery_employee",
     },
     client_id,
     subject: { id: id, name: id, type: "box" },
     metadata: { action: "unlock_verified" }
    });
   }
  } catch (err) {
   logger.error(`Failed to write GrubLock unlock-verified audit log: ${err}`);
  }

  return context.json<APIResponse<typeof result>>(
   {
    success: true,
    code: 200,
    message: "Boxes unlocked successfully",
    data: result,
   },
   { status: 200 },
  );
 },
);
