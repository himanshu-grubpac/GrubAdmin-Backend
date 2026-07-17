import { loggerService } from "@/services/system-log.ts";
import { logger } from "@/utils/logger.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { unlockGrublockRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { saveDeliveryEmployeeOtp } from "@/db/actions/delivery-employee-otp.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import { services } from "@/services";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

export const unlockGrublockHandler = createHandlers(
 deliveryAuthGuard(["admin", "manager"]),
 unlockGrublockRequestBodyValidator,
 async (context) => {
  const { client_id, user_id, user, type, vertical_id } = context.var;
  const { ids, consumer_full_name, consumer_country_code, consumer_phone } =
   context.req.valid("json");

  const userObj = user as any;
  const isProduction = process.env.NODE_ENV === "production";
  const otp = isProduction
   ? String(Math.floor(1000 + Math.random() * 9000))
   : "2026";

  const otpResult = await saveDeliveryEmployeeOtp({
   email: userObj.email,
   otp,
   role: type,
   for_what: "unlock_box",
   metadata: {
    ids,
    requested_by: user_id,
    client_id,
    consumer: consumer_full_name
     ? { full_name: consumer_full_name, country_code: consumer_country_code, phone: consumer_phone }
     : undefined,
   },
  });

  if (!otpResult) {
   throw new APIError("Failed to generate OTP", undefined, undefined, 500);
  }

  const employeeEmail = userObj.email?.trim();
  if (isProduction) {
   if (!employeeEmail) {
    throw new APIError("No email found for this account!", undefined, undefined, 400);
   }
   await services.mailer.sendEmail({
    from: "ankan@sqaby.com",
    subject: "Delivery Portal - GrubLock Unlock OTP",
    to: employeeEmail,
    text: `Your OTP to unlock GrubLock is ${otp} (OTP Session ID: ${otpResult.otp_id})\n\nfor_what: unlock_box`,
   });
  }

  // Create notification for each unlock request
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
     type: "notification",
     title: "Unlock Requested",
     description: `Unlock OTP requested for box ${label}${consumer_full_name ? ` by ${consumer_full_name}` : ""}. OTP sent to registered email.`,
    });
   }
  } catch (err) {
   console.error("Failed to create unlock request notification:", err);
  }

  // Audit log
  try {
   const actorName = type === "admin"
    ? userObj.name
    : `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim();
   for (const id of ids) {
    await loggerService.log({
     category: "GrubLock",
     type: "Status",
     actor: {
      id: user_id,
      name: actorName || "Unknown",
      role: type,
      table: type === "admin" ? "client" : "vertical_delivery_employee",
     },
     client_id,
     subject: { id: id, name: id, type: "box" },
     metadata: { action: "unlock_request" }
    });
   }
  } catch (err) {
   logger.error(`Failed to write GrubLock unlock-request audit log: ${err}`);
  }

  return context.json<APIResponse<{ otp_id: string }>>(
   {
    success: true,
    code: 200,
     data: { otp_id: otpResult.otp_id },
     message: "OTP sent to registered email",
   },
   { status: 200 },
  );
 },
);
