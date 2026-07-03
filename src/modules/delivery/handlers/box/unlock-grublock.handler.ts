import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { unlockGrublockRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { saveDeliveryEmployeeOtp } from "@/db/actions/delivery-employee-otp.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const unlockGrublockHandler = createHandlers(
 deliveryAuthGuard(["admin", "manager", "delivery"]),
 unlockGrublockRequestBodyValidator,
 async (context) => {
  const { client_id, user_id, user, type, vertical_id } = context.var;
  const { ids, consumer_full_name, consumer_country_code, consumer_phone } =
   context.req.valid("json");

  const userObj = user as any;
  const otp = process.env.NODE_ENV === "production"
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

  // Create notification for each unlock request
  try {
   for (const boxId of ids) {
    await createNotification({
     client_id,
     vertical_id,
     box_id: boxId,
     type: "notification",
     title: "Unlock Requested",
     description: `Unlock OTP requested for box ${boxId}${consumer_full_name ? ` by ${consumer_full_name}` : ""}. OTP sent to registered email.`,
    });
   }
  } catch (err) {
   console.error("Failed to create unlock request notification:", err);
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
     metadata: { action: "unlock_request" }
    });
   }
  } catch (err) { }
  // End auto-injected log

  return context.json<APIResponse<{ otp_id: string }>>(
   {
    success: true,
    code: 200,
     data: { otp_id: otpResult.id },
    message: "OTP sent to mobile successfully",
   },
   { status: 200 },
  );
 },
);
