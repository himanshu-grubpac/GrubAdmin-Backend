/**
 * Delivery-Mobile error templates.
 * 
 * The delivery-mobile module shares the `delivery.*` template namespace with the delivery module.
 * Mobile-specific error templates can be added here and will be merged at the
 * top-level barrel in src/configs/error-templates.ts.
 *
 * Re-exports delivery templates as its base — extend here for mobile-specific overrides.
 */
export { deliveryErrorTemplates as deliveryMobileErrorTemplates } from "@/modules/delivery/configs/error-templates";
