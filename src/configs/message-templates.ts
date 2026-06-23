/**
 * Message Templates Barrel — GrubPac
 *
 * Types live in: src/configs/template-types.ts  (no circular deps)
 * Module templates live in: src/modules/<group>/configs/message-templates.ts
 *
 * This file assembles the unified dot-path map and re-exports everything
 * so all existing consumers (@/configs/message-templates) keep working.
 */

import { deliveryMessageTemplates } from "@/modules/delivery/configs/message-templates";
import { adminMessageTemplates } from "@/modules/admin/configs/message-templates";
import { hospitalityMessageTemplates } from "@/modules/hospitality/configs/message-templates";

// Re-export types for consumers that do `import type { MessageTemplateMap } from "@/configs/message-templates"`
export type {
	MessageTemplate,
	MessageTemplateMap,
} from "@/configs/template-types";

// Re-export each module's named map for direct, typed access
export { deliveryMessageTemplates } from "@/modules/delivery/configs/message-templates";
export { adminMessageTemplates } from "@/modules/admin/configs/message-templates";
export { hospitalityMessageTemplates } from "@/modules/hospitality/configs/message-templates";

// delivery-mobile re-exports delivery's templates (shared namespace)
export { deliveryMobileMessageTemplates } from "@/modules/delivery-mobile/configs/message-templates";

import type { MessageTemplateMap } from "@/configs/template-types";

/**
 * Unified message template map keyed by module namespace.
 * Resolved by the message utility via dot-path strings, e.g.:
 *   "delivery.restaurant.create.SUCCESS"
 *   "admin.auth.login.SUCCESS"
 */
export const messageTemplates: MessageTemplateMap = {
	delivery: deliveryMessageTemplates,
	admin: adminMessageTemplates,
	hospitality: hospitalityMessageTemplates,
};
