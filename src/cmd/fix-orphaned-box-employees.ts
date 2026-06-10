import { prisma } from "../db/index.ts";

async function main() {
	console.log("Checking for orphaned box connection_employee_id references...");
	try {
		const orphaned = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
			`SELECT b.id FROM \`box\` b
       WHERE b.connection_employee_id IS NOT NULL
         AND b.connection_employee_id != ''
         AND NOT EXISTS (
           SELECT 1 FROM \`vertical_delivery_employee\` e WHERE e.id = b.connection_employee_id
         )`
		);

		if (orphaned.length === 0) {
			console.log("No orphaned box employee references found. Safe to migrate!");
			return;
		}

		console.log(`Found ${orphaned.length} orphaned box(es) with invalid connection_employee_id. Clearing...`);

		const ids = orphaned.map((r) => r.id);
		const batchSize = 100;
		for (let i = 0; i < ids.length; i += batchSize) {
			const batch = ids.slice(i, i + batchSize);
			const placeholders = batch.map(() => "?").join(",");
			await prisma.$executeRawUnsafe(
				`UPDATE \`box\` SET connection_employee_id = NULL WHERE id IN (${placeholders})`,
				...batch
			);
		}

		console.log(`Cleared ${orphaned.length} orphaned connection_employee_id(s) successfully!`);
	} catch (error) {
		console.error("Error fixing orphaned box employees:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
	await prisma.$disconnect();
}

main();
