import { prisma } from "../db/index.ts";

async function main() {
	try {
		// --- Fix 1: box.connection_employee_id -> vertical_delivery_employee.id ---
		await fixOrphanedRef(
			"box",
			"connection_employee_id",
			"vertical_delivery_employee",
			"connection_employee_id",
		);

		// --- Fix 2: vertical_delivery_consumer_box.consumer_id -> vertical_delivery_consumer.id ---
		// consumer_id is required, so DELETE orphaned rows instead of NULL
		await deleteOrphanedRows(
			"vertical_delivery_consumer_box",
			"consumer_id",
			"vertical_delivery_consumer",
			"consumer_id",
		);

		// --- Fix 3: vertical_delivery_employee_box.employee_id -> vertical_delivery_employee.id ---
		await fixOrphanedRef(
			"vertical_delivery_employee_box",
			"employee_id",
			"vertical_delivery_employee",
			"employee_id",
		);

		// --- Fix 4: vertical_delivery_consumer_box.box_id -> box.id ---
		// box_id is required, so DELETE orphaned rows instead of NULL
		await deleteOrphanedRows(
			"vertical_delivery_consumer_box",
			"box_id",
			"box",
			"box_id",
		);

		// --- Fix 5: vertical_delivery_employee_box.box_id -> box.id ---
		// box_id is required, so DELETE orphaned rows instead of NULL
		await deleteOrphanedRows(
			"vertical_delivery_employee_box",
			"box_id",
			"box",
			"box_id",
		);

		console.log("All orphaned FK references cleared successfully!");
	} catch (error) {
		console.error("Error fixing orphaned FK references:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
	await prisma.$disconnect();
}

async function fixOrphanedRef(
	childTable: string,
	childColumn: string,
	parentTable: string,
	label: string,
) {
	console.log(`Checking ${childTable}.${childColumn} -> ${parentTable}.id ...`);

	const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
		`SELECT t.id FROM \`${childTable}\` t
     WHERE t.\`${childColumn}\` IS NOT NULL
       AND t.\`${childColumn}\` != ''
       AND NOT EXISTS (
         SELECT 1 FROM \`${parentTable}\` p WHERE p.id = t.\`${childColumn}\`
       )`
	);

	if (rows.length === 0) {
		console.log(`  No orphaned ${label} references found.`);
		return;
	}

	console.log(`  Found ${rows.length} orphaned row(s) with invalid ${label}. Clearing...`);

	const ids = rows.map((r) => r.id);
	const batchSize = 100;
	for (let i = 0; i < ids.length; i += batchSize) {
		const batch = ids.slice(i, i + batchSize);
		const placeholders = batch.map(() => "?").join(",");
		await prisma.$executeRawUnsafe(
			`UPDATE \`${childTable}\` SET \`${childColumn}\` = NULL WHERE id IN (${placeholders})`,
			...batch
		);
	}

	console.log(`  Cleared ${rows.length} orphaned ${label} reference(s).`);
}

async function deleteOrphanedRows(
	childTable: string,
	childColumn: string,
	parentTable: string,
	label: string,
) {
	console.log(`Checking ${childTable}.${childColumn} -> ${parentTable}.id ...`);

	const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
		`SELECT t.id FROM \`${childTable}\` t
     WHERE t.\`${childColumn}\` IS NOT NULL
       AND t.\`${childColumn}\` != ''
       AND NOT EXISTS (
         SELECT 1 FROM \`${parentTable}\` p WHERE p.id = t.\`${childColumn}\`
       )`
	);

	if (rows.length === 0) {
		console.log(`  No orphaned ${label} references found.`);
		return;
	}

	console.log(`  Found ${rows.length} orphaned row(s) with invalid ${label}. Deleting...`);

	const ids = rows.map((r) => r.id);
	const batchSize = 100;
	for (let i = 0; i < ids.length; i += batchSize) {
		const batch = ids.slice(i, i + batchSize);
		const placeholders = batch.map(() => "?").join(",");
		await prisma.$executeRawUnsafe(
			`DELETE FROM \`${childTable}\` WHERE id IN (${placeholders})`,
			...batch
		);
	}

	console.log(`  Deleted ${rows.length} orphaned ${label} reference(s).`);
}

main();
