/**
 * Delivery-Mobile message templates.
 *
 * The delivery-mobile module shares the `delivery.*` template namespace with the delivery module.
 * Mobile-specific message templates can be added here and will be merged at the
 * top-level barrel in src/configs/message-templates.ts.
 *
 * Re-exports delivery templates as its base — extend here for mobile-specific overrides.
 */
export { deliveryMessageTemplates as deliveryMobileMessageTemplates } from "@/modules/delivery/configs/message-templates";
