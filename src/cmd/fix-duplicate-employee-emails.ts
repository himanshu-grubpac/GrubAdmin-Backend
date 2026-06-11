import { prisma } from "../db/index.ts";

async function main() {
	console.log("Checking for duplicate employee emails...");
	try {
		const tableCheck = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
			`SELECT COUNT(*) as cnt FROM information_schema.tables 
			WHERE table_schema = DATABASE() 
			AND table_name = 'vertical_delivery_employee'`
		);

		if (!tableCheck?.[0]?.cnt) {
			console.log("Table 'vertical_delivery_employee' does not exist. Skipping.");
			return;
		}

		const duplicates = await prisma.vertical_delivery_employee.groupBy({
			by: ["email"],
			_count: { email: true },
			having: { email: { _count: { gt: 1 } } },
		});

		if (duplicates.length === 0) {
			console.log("No duplicate employee emails found. Safe to migrate!");
			return;
		}

		console.log(`Found ${duplicates.length} duplicate email groups. Fixing...`);

		for (const group of duplicates) {
			const employees = await prisma.vertical_delivery_employee.findMany({
				where: { email: group.email },
				orderBy: { joining_date: "asc" },
			});

			const [keep, ...toFix] = employees;
			console.log(`  Keeping: ${keep.email} (id: ${keep.id})`);

			for (let i = 0; i < toFix.length; i++) {
				const emp = toFix[i];
				const newEmail = `${emp.email}+fix_${i + 1}_${emp.id.slice(0, 8)}`;
				await prisma.vertical_delivery_employee.update({
					where: { id: emp.id },
					data: { email: newEmail },
				});
				console.log(`  Fixed: ${emp.email} -> ${newEmail} (id: ${emp.id})`);
			}
		}

		console.log("All duplicate employee emails fixed successfully!");
	} catch (error) {
		console.error("Error fixing duplicate employee emails:", error);
		process.exit(1);
	} finally {
		process.exit(0);
	}
}

main();
