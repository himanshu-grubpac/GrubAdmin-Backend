import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { getAllPermissions } from "@/configs/constants.ts";

const backfillSuperAdminPermissions = async () => {
	logger.info("Starting Super Admin permission backfill...");

	const allPermissions = getAllPermissions();

	const superAdminRoles = await prisma.role.findMany({
		where: {
			is_super_admin: true,
			NOT: { status: "deleted" },
		},
	});

	logger.info(`Found ${superAdminRoles.length} Super Admin role(s) to update.`);

	let updated = 0;
	let skipped = 0;

	for (const role of superAdminRoles) {
		const currentPerms = role.permissions_json as Record<string, unknown>;
		const hasAllPerms =
			currentPerms &&
			Object.keys(currentPerms).length > 0 &&
			Object.keys(allPermissions).every((topic) => topic in currentPerms);

		if (hasAllPerms) {
			logger.info(`  [SKIP] Role "${role.name}" (${role.id}) already has full permissions.`);
			skipped++;
			continue;
		}

		await prisma.role.update({
			where: { id: role.id },
			data: { permissions_json: allPermissions },
		});

		logger.info(`  [OK]   Role "${role.name}" (${role.id}) updated with all permissions.`);
		updated++;
	}

	logger.info(`Backfill complete: ${updated} updated, ${skipped} skipped.`);
};

await backfillSuperAdminPermissions();
process.exit(0);
