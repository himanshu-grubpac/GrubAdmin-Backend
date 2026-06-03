import { Hono } from "hono";
import { healthCheckHandler, livenessHandler, readinessHandler } from "./handlers/health";
import { getConfigsHandler } from "@/modules/common/handlers/config";
import { getIconsHandlers } from "@/modules/common/handlers/icon";
import { getPermissionsHandler } from "@/modules/common/handlers/permissions";
import { resetPasswordUtilityHandler } from "@/modules/common/handlers/auth/reset-password-utility.handler";
import { setPasswordUtilityHandler } from "@/modules/common/handlers/auth/set-password-utility.handler";
import { setSuperAdminPasswordHandler } from "@/modules/common/handlers/auth/set-super-admin-password.handler";

export const commonRouter = new Hono();

commonRouter.get("/health", ...healthCheckHandler);
commonRouter.get("/healthz", ...livenessHandler);
commonRouter.get("/readyz", ...readinessHandler);
commonRouter.get("/config", ...getConfigsHandler);
commonRouter.get("/icons", ...getIconsHandlers);
commonRouter.get("/permissions", ...getPermissionsHandler);
commonRouter.post("/auth/utility/reset-password", ...resetPasswordUtilityHandler);
commonRouter.post("/auth/utility/set-password", ...setPasswordUtilityHandler);
commonRouter.post("/auth/utility/set-password/superadmin", ...setSuperAdminPasswordHandler);
