import { prisma } from "../db/index.ts";

async function main() {
	try {
		await prisma.box.findFirst({ take: 1 });
		await prisma.vertical_delivery_employee.findFirst({ take: 1 });
		await prisma.vertical_delivery_consumer_box.findFirst({ take: 1 });
		await prisma.vertical_delivery_consumer.findFirst({ take: 1 });
		await prisma.vertical_delivery_employee_box.findFirst({ take: 1 });
	} catch {
		console.log("Required tables do not exist. Skipping all fixes.");
		await prisma.$disconnect();
		return;
	}

	try {
		// --- Fix 1: box.connection_employee_id -> vertical_delivery_employee.id ---
		console.log("Checking box.connection_employee_id -> vertical_delivery_employee.id ...");
		const orphanedBoxes = await prisma.box.findMany({
			where: { connection_employee_id: { not: null }, connection_employee: null },
			select: { id: true },
		});
		if (orphanedBoxes.length > 0) {
			console.log(`  Found ${orphanedBoxes.length} orphaned connection_employee_id reference(s). Clearing...`);
			for (const box of orphanedBoxes) {
				await prisma.box.update({ where: { id: box.id }, data: { connection_employee_id: null } });
			}
			console.log(`  Cleared ${orphanedBoxes.length} orphaned connection_employee_id reference(s).`);
		} else {
			console.log("  No orphaned connection_employee_id references found.");
		}

		// --- Fix 2: vertical_delivery_consumer_box.consumer_id -> vertical_delivery_consumer.id ---
		console.log("Checking vertical_delivery_consumer_box.consumer_id -> vertical_delivery_consumer.id ...");
		const orphanedConsumerBoxes = await prisma.vertical_delivery_consumer_box.findMany({
			where: { consumer: null },
			select: { id: true },
		});
		if (orphanedConsumerBoxes.length > 0) {
			console.log(`  Found ${orphanedConsumerBoxes.length} orphaned consumer_id reference(s). Deleting...`);
			for (const row of orphanedConsumerBoxes) {
				await prisma.vertical_delivery_consumer_box.delete({ where: { id: row.id } });
			}
			console.log(`  Deleted ${orphanedConsumerBoxes.length} orphaned consumer_id reference(s).`);
		} else {
			console.log("  No orphaned consumer_id references found.");
		}

		// --- Fix 3: vertical_delivery_employee_box.employee_id -> vertical_delivery_employee.id ---
		console.log("Checking vertical_delivery_employee_box.employee_id -> vertical_delivery_employee.id ...");
		const orphanedEmployeeBoxes = await prisma.vertical_delivery_employee_box.findMany({
			where: { employee_id: { not: null }, employee: null },
			select: { id: true },
		});
		if (orphanedEmployeeBoxes.length > 0) {
			console.log(`  Found ${orphanedEmployeeBoxes.length} orphaned employee_id reference(s). Clearing...`);
			for (const row of orphanedEmployeeBoxes) {
				await prisma.vertical_delivery_employee_box.update({
					where: { id: row.id },
					data: { employee_id: null },
				});
			}
			console.log(`  Cleared ${orphanedEmployeeBoxes.length} orphaned employee_id reference(s).`);
		} else {
			console.log("  No orphaned employee_id references found.");
		}

		// --- Fix 4: vertical_delivery_consumer_box.box_id -> box.id ---
		console.log("Checking vertical_delivery_consumer_box.box_id -> box.id ...");
		const orphanedConsumerBoxesBox = await prisma.vertical_delivery_consumer_box.findMany({
			where: { box: null },
			select: { id: true },
		});
		if (orphanedConsumerBoxesBox.length > 0) {
			console.log(`  Found ${orphanedConsumerBoxesBox.length} orphaned box_id reference(s). Deleting...`);
			for (const row of orphanedConsumerBoxesBox) {
				await prisma.vertical_delivery_consumer_box.delete({ where: { id: row.id } });
			}
			console.log(`  Deleted ${orphanedConsumerBoxesBox.length} orphaned box_id reference(s).`);
		} else {
			console.log("  No orphaned box_id references found.");
		}

		// --- Fix 5: vertical_delivery_employee_box.box_id -> box.id ---
		console.log("Checking vertical_delivery_employee_box.box_id -> box.id ...");
		const orphanedEmployeeBoxesBox = await prisma.vertical_delivery_employee_box.findMany({
			where: { box: null },
			select: { id: true },
		});
		if (orphanedEmployeeBoxesBox.length > 0) {
			console.log(`  Found ${orphanedEmployeeBoxesBox.length} orphaned box_id reference(s). Deleting...`);
			for (const row of orphanedEmployeeBoxesBox) {
				await prisma.vertical_delivery_employee_box.delete({ where: { id: row.id } });
			}
			console.log(`  Deleted ${orphanedEmployeeBoxesBox.length} orphaned box_id reference(s).`);
		} else {
			console.log("  No orphaned box_id references found.");
		}

		console.log("All orphaned FK references cleared successfully!");
	} catch (error) {
		console.error("Error fixing orphaned FK references:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
	await prisma.$disconnect();
}

main();
