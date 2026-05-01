import { createHandlers } from "@/utils/hono-factory.ts";
import { getConfigs } from "@/db/actions/config.actions.ts";
import type { APIResponse } from "@/types/api";

interface MobileConfig {
	minAndroidVersion?: string;
	minIosVersion?: string;
	androidLinks?: string;
	iosLinks?: string;
	maintenanceMode?: string;
	imageUrls?: string;
	privacyPolicyLink?: string;
	termsAndConditionsLink?: string;
}

interface ResponseData {
	config: MobileConfig;
}

export const getConfigHandler = createHandlers(async (context) => {
	const configs = await getConfigs();

		// Transform configs array into a key-value object (keep original keys)
		const configMap: Record<string, string> = {};
		configs.forEach((config) => {
			configMap[config.key] = config.value;
		});

		// Helper to find a config value by trying multiple key variants
		const findConfigValue = (variants: string[]): string | undefined => {
			const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
			const normalizedMap: Record<string, string> = {};
			for (const k of Object.keys(configMap)) {
				const val = configMap[k];
				if (val) normalizedMap[normalize(k)] = val;
			}

			for (const v of variants) {
				const n = normalize(v);
				if (n in normalizedMap) return normalizedMap[n];
			}
			return undefined;
		};

		// Extract mobile app config fields (try common naming variants)
		const mobileConfig: MobileConfig = {
			minAndroidVersion: findConfigValue(["minAndroidVersion", "min_android_version", "min-android-version", "minandroidversion"]),
			minIosVersion: findConfigValue(["minIosVersion", "min_ios_version", "min-ios-version", "miniosversion"]),
			androidLinks: findConfigValue(["androidLinks", "android_links", "android-links", "androidlinks"]),
			iosLinks: findConfigValue(["iosLinks", "ios_links", "ios-links", "ioslinks"]),
			maintenanceMode: findConfigValue(["maintenanceMode", "maintenance_mode", "maintenance-mode", "maintenance"]),
			imageUrls: findConfigValue(["imageUrls", "image_urls", "image-urls", "imageurls"]),
			privacyPolicyLink: findConfigValue(["privacyPolicyLink", "privacy_policy_link", "privacy-policy-link", "privacypolicylink"]),
			termsAndConditionsLink: findConfigValue(["termsAndConditionsLink", "terms_and_conditions_link", "terms-and-conditions-link", "termsandconditionslink"]),
		};

	return context.json<APIResponse<ResponseData>>(
		{
			success: true,
			code: 200,
			data: {
				config: mobileConfig,
			},
		},
		{
			status: 200,
		},
	);
});
