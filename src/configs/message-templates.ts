/**
 * Message Templates Barrel — GrubPac
 *
 * Types live in: src/configs/template-types.ts  (no circular deps)
 * Module templates live in: src/modules/<group>/configs/message-templates.ts
 *
 * This file assembles the unified dot-path map and re-exports everything
 * so all existing consumers (@/configs/message-templates) keep working.
 */

import { foodMessageTemplates } from "@/modules/food/configs/message-templates";
import { adminMessageTemplates } from "@/modules/admin/configs/message-templates";

// Re-export types for consumers that do `import type { MessageTemplateMap } from "@/configs/message-templates"`
export type {
	MessageTemplate,
	MessageTemplateMap,
} from "@/configs/template-types";

// Re-export each module's named map for direct, typed access
export { foodMessageTemplates } from "@/modules/food/configs/message-templates";
export { adminMessageTemplates } from "@/modules/admin/configs/message-templates";

// food-mobile re-exports food's templates (shared namespace)
export { foodMobileMessageTemplates } from "@/modules/food-mobile/configs/message-templates";

import type { MessageTemplateMap } from "@/configs/template-types";

/**
 * Unified message template map keyed by module namespace.
 * Resolved by the message utility via dot-path strings, e.g.:
 *   "food.restaurant.create.SUCCESS"
 *   "admin.auth.login.SUCCESS"
 */
export const messageTemplates: MessageTemplateMap = {
	food: foodMessageTemplates,
	admin: adminMessageTemplates,
};
