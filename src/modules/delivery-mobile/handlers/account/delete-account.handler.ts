import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { deleteAccountRequestBodyValidator } from "delivery-mobile/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { deleteVerticalDeliveryEmployees } from "@/db/actions/vertical-delivery-employee.actions";
import type { vertical_delivery_employee } from "@/db/types";

export const deleteAccountHandler = createHandlers(
    deliveryAuthGuard(),
    deleteAccountRequestBodyValidator,
    async (context) => {
        const { user_id, type, user } = context.var;
        // const { password } = context.req.valid("json");

        // 1. Verify password (Temporarily disabled)
        /*
        if (!user.password) {
            throw new APIError("Password not set for this account. Please set a password first.", 400);
        }

        const isCorrectPassword = await Bcrypt.compareHash({
            data: password,
            hashedValue: user.password,
        });

        if (!isCorrectPassword) {
            throw new APIError("Invalid password. Authorization failed.", 401);
        }
        */

        // 2. Handle deletion based on type
        if (type === "admin") {
            // For now, following the pattern of preventing super_admin deletion via simple delete account
            // They should probably transfer ownership or contact support.
            throw new APIError("Super Admin account cannot be deleted. Please transfer ownership first or contact support.", undefined, undefined, 403);
        }

        const employee = user as vertical_delivery_employee;

        // 3. Delete employee account
        await deleteVerticalDeliveryEmployees({
            ids: [user_id],
            client_id: employee.client_id!,
        });

        return context.json<APIResponse>(
            {
                success: true,
                code: 200,
                message: "Account deleted successfully.",
            },
            {
                status: 200,
            },
        );
    }
);

