import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

const SYSTEM_CONFIGS = [
  { id: SEED_IDS.CONFIG_MIN_ANDROID, key: "minAndroidVersion", value: "1.0" },
  { id: SEED_IDS.CONFIG_MIN_IOS, key: "minIosVersion", value: "1.0" },
  { id: SEED_IDS.CONFIG_ANDROID_LINKS, key: "androidLinks", value: "https://play.google.com/" },
  { id: SEED_IDS.CONFIG_IOS_LINKS, key: "iosLinks", value: "https://apps.apple.com/" },
  { id: SEED_IDS.CONFIG_MAINTENANCE, key: "maintenanceMode", value: "false" },
  { id: SEED_IDS.CONFIG_IMAGE_URLS, key: "imageUrls", value: "https://cdn.example.com" },
  { id: SEED_IDS.CONFIG_PRIVACY, key: "privacyPolicyLink", value: "https://example.com/privacy" },
  { id: SEED_IDS.CONFIG_TERMS, key: "termsAndConditionsLink", value: "https://example.com/terms" },
  { id: SEED_IDS.CONFIG_JWT_ACCESS, key: "jwtAccessTokenExpiry", value: "86400" },
  { id: SEED_IDS.CONFIG_JWT_REFRESH, key: "jwtRefreshTokenExpiry", value: "604800" },
  { id: SEED_IDS.CONFIG_PAGE_SIZE, key: "defaultPageSize", value: "40" },
  { id: SEED_IDS.CONFIG_APP_NAME, key: "appName", value: "GrubPac Admin" },
  { id: SEED_IDS.CONFIG_SUPPORT_EMAIL, key: "supportEmail", value: "support@grubpac.com" },
  { id: SEED_IDS.CONFIG_MAX_LOGIN, key: "maxLoginAttempts", value: "5" },
  { id: SEED_IDS.CONFIG_OTP_EXPIRY, key: "otpExpirySeconds", value: "300" },
];

const seedSystemConfigs = async (): Promise<void> => {
  logger.info("Seeding system configurations...");
  for (const cfg of SYSTEM_CONFIGS) {
    await prisma.system_config.upsert({
      where: { id: cfg.id },
      update: { key: cfg.key, value: cfg.value },
      create: { id: cfg.id, key: cfg.key, value: cfg.value },
    });
    logger.info(`  Config "${cfg.key}" ready.`);
  }
  logger.info(`Seeded ${SYSTEM_CONFIGS.length} system configurations.`);
};

export default seedSystemConfigs;
