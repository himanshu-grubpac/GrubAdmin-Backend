import { prisma } from "../db/index.ts";

async function main() {
	console.log("Checking for duplicate client_display_id records...");
	try {
		const duplicates = await prisma.client.groupBy({
			by: ["client_display_id"],
			_count: {
				client_display_id: true,
			},
			having: {
				client_display_id: {
					_count: {
						gt: 1,
					},
				},
			},
		});

		if (duplicates.length === 0) {
			console.log(" No duplicate client_display_id records found in the database. Safe to migrate!");
		} else {
			console.log("Found duplicate client_display_id records:");
			console.log(JSON.stringify(duplicates, null, 2));
		}
	} catch (error) {
		console.error("Error checking duplicates:", error);
	} finally {
		await prisma.$disconnect();
	}
}

main();
