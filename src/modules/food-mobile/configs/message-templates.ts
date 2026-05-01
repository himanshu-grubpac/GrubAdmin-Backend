/**
 * Food-Mobile message templates.
 *
 * The food-mobile module shares the `food.*` template namespace with the food module.
 * Mobile-specific message templates can be added here and will be merged at the
 * top-level barrel in src/configs/message-templates.ts.
 *
 * Re-exports food templates as its base — extend here for mobile-specific overrides.
 */
export { foodMessageTemplates as foodMobileMessageTemplates } from "@/modules/food/configs/message-templates";
