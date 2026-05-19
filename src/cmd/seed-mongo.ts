import { connectMongoDB, prisma } from "@/db";
import { AdminNotification } from "@/db/mongo-schema";
import { ClientAdminLog, FoodEmployeeLog, RestaurantLog, GrubpacLog } from "@/db/mongo-schema";
import { logger } from "@/utils/logger";

const seedAdminNotifications = async (superAdminId: string, superAdminName: string) => {
	const existingCount = await AdminNotification.countDocuments();
	if (existingCount > 0) {
		logger.info(`Admin notifications already exist (${existingCount}), skipping seed.`);
		return;
	}

	const notifications = [
		{
			title: "Welcome to GrubPac Admin",
			description: "Your GrubPac Admin account has been created successfully. You can now manage clients, boxes, employees, and more.",
			type: "success" as const,
			status: "unread" as const,
			goal: "update_profile" as const,
			recipient_id: superAdminId,
			employee_id: superAdminId,
			employee_name: superAdminName,
		},
		{
			title: "Demo Client Created",
			description: `Admin ${superAdminName} created a new client account for demonstration purposes. View Details in logs.`,
			type: "success" as const,
			status: "unread" as const,
			goal: "deletion" as const,
			recipient_id: superAdminId,
			employee_id: superAdminId,
			employee_name: superAdminName,
			item_id: "demo-client-001",
			item_name: "Demo Restaurant Inc.",
			item_type: "Client",
		},
		{
			title: "Box Status Alert",
			description: "Box GRUB-001 has been disconnected for more than 30 minutes. Please investigate.",
			type: "error" as const,
			status: "unread" as const,
			goal: "update_permission_and_roles" as const,
			recipient_id: superAdminId,
			item_id: "box-001",
			item_name: "GRUB-001",
			item_type: "Box",
		},
		{
			title: "Role Permissions Updated",
			description: `Admin ${superAdminName} updated permissions for the Support Manager role. View Details in logs.`,
			type: "warning" as const,
			status: "unread" as const,
			goal: "update_permission_and_roles" as const,
			recipient_id: superAdminId,
			employee_id: superAdminId,
			employee_name: superAdminName,
			role_id: "support-manager-role",
		},
		{
			title: "Box Status Alert",
			description: "Box GRUB-001 has been disconnected for more than 30 minutes. Please investigate.",
			type: "error" as const,
			status: "unread" as const,
			goal: "deletion" as const,
			recipient_id: superAdminId,
			item_id: "box-001",
			item_name: "GRUB-001",
			item_type: "Box",
		},
	];

	await AdminNotification.insertMany(notifications);
	logger.info(`Seeded ${notifications.length} admin notifications.`);
};

const seedSystemLogs = async (superAdminId: string, superAdminName: string) => {
	const adminLogCount = await ClientAdminLog.countDocuments();
	if (adminLogCount > 59) {
		logger.info(`System logs already seeded (${adminLogCount}), skipping seed.`);
		return;
	}

	const sampleLogs = [
		{
			model: ClientAdminLog,
			collection: "admin_logs",
			documents: [
				{
					category: "Restaurant",
					type: "Creation",
					description: `[${superAdminName}, ${superAdminId}] added new restaurant - [Sample Restaurant, rest-001]`,
					actor: { id: superAdminId, name: superAdminName, role: "Super Admin", ip: "192.168.1.1" },
					subject: { id: "rest-001", name: "Sample Restaurant", type: "restaurant" },
				},
				{
					category: "Employee",
					type: "Creation",
					description: `Account created and assigned to [Sample Employee] by [${superAdminName}, ${superAdminId}]`,
					actor: { id: superAdminId, name: superAdminName, role: "Super Admin", ip: "192.168.1.1" },
					subject: { id: "emp-001", name: "Sample Employee", type: "employee" },
				},
				{
					category: "GrubPac",
					type: "Creation",
					description: `[GRUB-001, box-001] created by [${superAdminName}, ${superAdminId}]`,
					actor: { id: superAdminId, name: superAdminName, role: "Super Admin", ip: "192.168.1.1" },
					subject: { id: "box-001", name: "GRUB-001", type: "box" },
				},
				{
					category: "Profile",
					type: "Access",
					description: `You logged in`,
					actor: { id: superAdminId, name: superAdminName, role: "Super Admin", ip: "192.168.1.1" },
					subject: { id: superAdminId, name: "Self", type: "account" },
				},
			],
		},
		{
			model: FoodEmployeeLog,
			collection: "food_employee_logs",
			documents: [
				{
					category: "Employee",
					type: "Creation",
					description: `Account created for [John Doe, emp-002]`,
					actor: { id: superAdminId, name: superAdminName, role: "admin", table: "client" },
					client_id: "demo-client-001",
					subject: { id: "emp-002", name: "John Doe", type: "employee" },
				},
				{
					category: "Employee",
					type: "Suspension",
					description: `Account suspended by [${superAdminName}, ${superAdminId}]`,
					actor: { id: superAdminId, name: superAdminName, role: "admin", table: "client" },
					client_id: "demo-client-001",
					subject: { id: "emp-002", name: "John Doe", type: "employee" },
				},
			],
		},
		{
			model: RestaurantLog,
			collection: "restaurant_logs",
			documents: [
				{
					category: "Restaurant",
					type: "Creation",
					description: `[${superAdminName}, ${superAdminId}] added new restaurant - [Pizza Place, rest-002]`,
					actor: { id: superAdminId, name: superAdminName, role: "admin", table: "client" },
					client_id: "demo-client-001",
					subject: { id: "rest-002", name: "Pizza Place", type: "restaurant" },
				},
			],
		},
		{
			model: GrubpacLog,
			collection: "grubpac_logs",
			documents: [
				{
					category: "GrubPac",
					type: "Assignment",
					description: `[GRUB-001, box-001] assigned to restaurant [Pizza Place, rest-002] by [${superAdminName}, ${superAdminId}]`,
					actor: { id: superAdminId, name: superAdminName, role: "admin", table: "client" },
					client_id: "demo-client-001",
					subject: { id: "box-001", name: "GRUB-001", type: "box" },
				},
				{
					category: "GrubLock",
					type: "Status",
					description: `[${superAdminName}, ${superAdminId}] locked [GRUB-001, box-001] - [Manager, manager@example.com]`,
					actor: { id: superAdminId, name: superAdminName, role: "admin", table: "client" },
					client_id: "demo-client-001",
					subject: { id: "box-001", name: "GRUB-001", type: "box" },
					metadata: { action: "lock", recipient: "Manager, manager@example.com" },
				},
				{
					category: "GrubPac",
					type: "Box status",
					description: `Box turned OFF`,
					actor: { id: "box-001", name: "GRUB-001" },
					client_id: "demo-client-001",
					subject: { id: "box-001", name: "GRUB-001", type: "box" },
					metadata: { state: "OFF" },
				},
			],
		},
	];

	for (const group of sampleLogs) {
		await group.model.insertMany(group.documents);
		logger.info(`Seeded ${group.documents.length} ${group.collection} entries.`);
	}
};

export const seedMongoData = async () => {
	const startTime = Date.now();
	logger.info("Initializing MongoDB seed sequence...");

	await connectMongoDB();

	const admin = await prisma.admin.findFirst({
		where: { role: { is_super_admin: true } },
		orderBy: { created_at: "asc" },
	});

	if (!admin) {
		logger.warn("No super admin found, skipping MongoDB seed.");
		return;
	}

	const adminName = `${admin.first_name} ${admin.last_name || ""}`.trim();
	const adminId = admin.id;

	await seedAdminNotifications(adminId, adminName);
	await seedSystemLogs(adminId, adminName);

	const endTime = Date.now();
	logger.info(`MongoDB seed completed in ${endTime - startTime}ms`);
};

const isMainModule = process.argv[1]?.includes("seed-mongo");
if (isMainModule) {
	await seedMongoData();
	process.exit(0);
}
