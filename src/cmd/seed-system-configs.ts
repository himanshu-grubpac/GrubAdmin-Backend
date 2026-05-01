import { prisma } from "@/db";
import { logger } from "@/utils/logger";

const defaultConfigs = [
    { key: "minAndroidVersion", value: "1.0" },
    { key: "minIosVersion", value: "1.0" },
    { key: "androidLinks", value: "https://play.google.com/" },
    { key: "iosLinks", value: "https://apps.apple.com/" },
    { key: "maintenanceMode", value: "false" },
    { key: "imageUrls", value: "https://cdn.example.com" },
    { key: "privacyPolicyLink", value: "https://example.com/privacy" },
    { key: "termsAndConditionsLink", value: "https://example.com/terms" },
];

const seed = async () => {
    try {
        const keys = defaultConfigs.map((c) => c.key);
        const existing = await prisma.system_config.findMany({ where: { key: { in: keys } } });
        const existingKeys = new Set(existing.map((e) => e.key));

        for (const cfg of defaultConfigs) {
            if (!existingKeys.has(cfg.key)) {
                await prisma.system_config.create({ data: cfg });
                logger.info(`Seeded config ${cfg.key}`);
            } else {
                logger.info(`Config ${cfg.key} already exists, skipping`);
            }
        }
    } catch (err) {
        logger.error(`Failed to seed system configs: ${err}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

if (require.main === module) {
    seed().then(() => {
        logger.info("System config seed complete");
        process.exit(0);
    });
}

export default seed;
