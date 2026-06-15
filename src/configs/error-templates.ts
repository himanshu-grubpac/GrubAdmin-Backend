/**
 * Error Templates Barrel — GrubPac
 *
 * Types live in: src/configs/template-types.ts  (no circular deps)
 * Module templates live in: src/modules/<group>/configs/error-templates.ts
 *
 * This file assembles the unified dot-path map and re-exports everything
 * so all existing consumers (@/configs/error-templates) keep working.
 */

import { deliveryErrorTemplates } from "@/modules/delivery/configs/error-templates";
import { adminErrorTemplates } from "@/modules/admin/configs/error-templates";

// Re-export types for consumers that do `import type { ErrorTemplateMap } from "@/configs/error-templates"`
export type {
	ErrorTemplate,
	ErrorTemplateMap,
} from "@/configs/template-types";

// Re-export each module's named map for direct, typed access
export { deliveryErrorTemplates } from "@/modules/delivery/configs/error-templates";
export { adminErrorTemplates } from "@/modules/admin/configs/error-templates";

// delivery-mobile re-exports delivery's templates (shared namespace)
export { deliveryMobileErrorTemplates } from "@/modules/delivery-mobile/configs/error-templates";

import type { ErrorTemplateMap } from "@/configs/template-types";

/**
 * Unified error template map keyed by module namespace.
 * Resolved by the global error handler via dot-path strings, e.g.:
 *   "delivery.auth.login.SUSPENDED"
 *   "admin.account.INVALID_PASSWORD"
 */
export const errorTemplates: ErrorTemplateMap = {
	delivery: deliveryErrorTemplates,
	admin: adminErrorTemplates,
};
