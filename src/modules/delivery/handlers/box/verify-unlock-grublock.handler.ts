import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { verifyUnlockGrublockRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
// import { getSavedDeliveryEmployeeOtp, deleteSavedDeliveryEmployeeOtp } from "@/db/actions/otp.actions.ts";
import { APIError } from "@/types/error";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import { getSavedDeliveryEmployeeOtp, deleteSavedDeliveryEmployeeOtp } from "@/db/actions/delivery-employee-otp.actions";

export const verifyUnlockGrublockHandler = createHandlers(
 deliveryAuthGuard(["admin", "manager", "delivery"]),
 verifyUnlockGrublockRequestBodyValidator,
 async (context) => {
  const { client_id, user_id, user, type, vertical_id } = context.var;
  const { otp_id, otp } = context.req.valid("json");

  const userObj = user as any;

  const savedOtp = await getSavedDeliveryEmployeeOtp(userObj.email, otp_id);
  if (!savedOtp) {
   throw new APIError("OTP expired or invalid", undefined, undefined, 400);
  }
  if (savedOtp.otp !== otp) {
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
   for (const boxId of ids) {
    await createNotification({
     client_id,
     vertical_id,
     box_id: boxId,
     type: "success",
     title: "Box Unlocked",
     description: `Box ${boxId} has been unlocked successfully`,
    });
   }
  } catch (err) {
   console.error("Failed to create unlock notification:", err);
  }

  // Start auto-injected log
  try {
   for (const id of ids) {
    await loggerService.log({
     category: "GrubLock",
     type: "OTP",
     actor: { 
      id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
      name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
      role: "admin", 
      table: "client" 
     },
     client_id: context.var.client_id,
     subject: { id: id, name: id, type: "box" },
     metadata: { action: "unlock_verified" }
    });
   }
  } catch (err) { }
  // End auto-injected log

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
