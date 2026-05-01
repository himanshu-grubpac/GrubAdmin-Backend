/**
 * Food-Mobile error templates.
 * 
 * The food-mobile module shares the `food.*` template namespace with the food module.
 * Mobile-specific error templates can be added here and will be merged at the
 * top-level barrel in src/configs/error-templates.ts.
 *
 * Re-exports food templates as its base — extend here for mobile-specific overrides.
 */
export { foodErrorTemplates as foodMobileErrorTemplates } from "@/modules/food/configs/error-templates";
