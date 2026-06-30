import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

type DepartmentStatus = "active" | "suspended";
type EmployeeRole = "manager" | "handler";
type EmployeeStatus = "active" | "suspended" | "unassigned";
type EmployeeBoxStatus = "shared" | "blocked";
type EmployeeBoxAccess = "direct" | "public" | "all_employees";
type DepartmentBoxStatus = "shared" | "not_shared" | "blocked";

const DEPARTMENTS: {
	id: string; name: string; client_id: string; status: DepartmentStatus;
}[] = [
	{ id: SEED_IDS.MEDICAL_DEPARTMENT_1, name: "Emergency", client_id: SEED_IDS.CLIENT_ACTIVE_3, status: "active" },
	{ id: SEED_IDS.MEDICAL_DEPARTMENT_2, name: "Pharmacy", client_id: SEED_IDS.CLIENT_ACTIVE_3, status: "active" },
	{ id: SEED_IDS.MEDICAL_DEPARTMENT_3, name: "Radiology", client_id: SEED_IDS.CLIENT_ACTIVE_2, status: "active" },
];

const EMPLOYEES: {
	id: string; first_name: string; last_name: string; country_code: string;
	mobile_number: string; email: string; employee_display_id: string;
	role: EmployeeRole; status: EmployeeStatus; client_id: string; department_id: string;
}[] = [
	{
		id: SEED_IDS.MEDICAL_EMPLOYEE_MANAGER_1, first_name: "Sarah", last_name: "Connor",
		country_code: "+1", mobile_number: "5553330001", email: "sarah.connor@mediquick.com",
		employee_display_id: "MED-EMP-001", role: "manager", status: "active",
		client_id: SEED_IDS.CLIENT_ACTIVE_3, department_id: SEED_IDS.MEDICAL_DEPARTMENT_1,
	},
	{
		id: SEED_IDS.MEDICAL_EMPLOYEE_MANAGER_2, first_name: "Mike", last_name: "Dexter",
		country_code: "+1", mobile_number: "5553330002", email: "mike.dexter@mediquick.com",
		employee_display_id: "MED-EMP-002", role: "manager", status: "active",
		client_id: SEED_IDS.CLIENT_ACTIVE_3, department_id: SEED_IDS.MEDICAL_DEPARTMENT_2,
	},
	{
		id: SEED_IDS.MEDICAL_EMPLOYEE_DELIVERY_1, first_name: "Jake", last_name: "Sullivan",
		country_code: "+1", mobile_number: "5553330003", email: "jake.sullivan@mediquick.com",
		employee_display_id: "MED-EMP-003", role: "handler", status: "active",
		client_id: SEED_IDS.CLIENT_ACTIVE_3, department_id: SEED_IDS.MEDICAL_DEPARTMENT_1,
	},
	{
		id: SEED_IDS.MEDICAL_EMPLOYEE_DELIVERY_2, first_name: "Lucy", last_name: "Chen",
		country_code: "+1", mobile_number: "5553330004", email: "lucy.chen@greenleaf.com",
		employee_display_id: "MED-EMP-004", role: "handler", status: "active",
		client_id: SEED_IDS.CLIENT_ACTIVE_2, department_id: SEED_IDS.MEDICAL_DEPARTMENT_3,
	},
	{
		id: SEED_IDS.MEDICAL_EMPLOYEE_SUSPENDED, first_name: "Tom", last_name: "Sawyer",
		country_code: "+1", mobile_number: "5553330005", email: "tom.sawyer@mediquick.com",
		employee_display_id: "MED-EMP-005", role: "handler", status: "suspended",
		client_id: SEED_IDS.CLIENT_ACTIVE_3, department_id: SEED_IDS.MEDICAL_DEPARTMENT_2,
	},
];

export const seedMedical = async (): Promise<void> => {
	logger.info("Seeding medical vertical...");

	// ── Departments ──────────────────────────────────────────────────────────
	for (const dept of DEPARTMENTS) {
		await prisma.vertical_medical_department.upsert({
			where: { id: dept.id },
			update: dept,
			create: dept,
		});
		logger.info(`  Department "${dept.name}" (${dept.status}) ready.`);
	}

	// ── Employees ────────────────────────────────────────────────────────────
	for (const emp of EMPLOYEES) {
		const { department_id, ...empData } = emp;
		await prisma.vertical_medical_employee.upsert({
			where: { id: emp.id },
			update: emp,
			create: {
				...empData,
				department_id,
			},
		});
		logger.info(`  Employee "${emp.first_name} ${emp.last_name}" (${emp.role}) ready.`);
	}

	// ── Employee-Box assignments ─────────────────────────────────────────────
	const clinicalTriBoxes = [SEED_IDS.BOX_005];
	const employeeBoxLinks: { employee_id: string; box_id: string; status: EmployeeBoxStatus; access: EmployeeBoxAccess }[] = [
		{ employee_id: SEED_IDS.MEDICAL_EMPLOYEE_MANAGER_1, box_id: SEED_IDS.BOX_005, status: "shared", access: "direct" },
		{ employee_id: SEED_IDS.MEDICAL_EMPLOYEE_DELIVERY_1, box_id: SEED_IDS.BOX_005, status: "shared", access: "direct" },
	];

	for (const link of employeeBoxLinks) {
		await prisma.vertical_medical_employee_box.upsert({
			where: { employee_id_box_id: { employee_id: link.employee_id, box_id: link.box_id } },
			update: { status: link.status, access: link.access },
			create: {
				employee_id: link.employee_id,
				box_id: link.box_id,
				status: link.status,
				access: link.access,
			},
		});
		logger.info(`  Employee-Box link: ${link.employee_id} → ${link.box_id}`);
	}

	// ── Department-Box assignments ────────────────────────────────────────────
	const departmentBoxLinks: { department_id: string; box_id: string; status: DepartmentBoxStatus }[] = [
		{ department_id: SEED_IDS.MEDICAL_DEPARTMENT_1, box_id: SEED_IDS.BOX_005, status: "shared" },
		{ department_id: SEED_IDS.MEDICAL_DEPARTMENT_2, box_id: SEED_IDS.BOX_005, status: "shared" },
	];

	for (const link of departmentBoxLinks) {
		await prisma.vertical_medical_department_box.upsert({
			where: { department_id_box_id: { department_id: link.department_id, box_id: link.box_id } },
			update: { status: link.status },
			create: { department_id: link.department_id, box_id: link.box_id, status: link.status },
		});
		logger.info(`  Department-Box link: ${link.department_id} → ${link.box_id}`);
	}

	// ── Set medical_connection_employee on box ────────────────────────────────
	await prisma.box.update({
		where: { id: SEED_IDS.BOX_005 },
		data: { medical_connection_employee_id: SEED_IDS.MEDICAL_EMPLOYEE_DELIVERY_1 },
	});
	logger.info(`  Box BOX_005 connected to employee ${SEED_IDS.MEDICAL_EMPLOYEE_DELIVERY_1}`);

	// ── Consumers ────────────────────────────────────────────────────────────
	const CONSUMERS: {
		id: string; full_name: string; country_code: string; phone: string; client_id: string;
	}[] = [
		{ id: SEED_IDS.MEDICAL_CONSUMER_1, full_name: "John Doe", country_code: "+1", phone: "5554440001", client_id: SEED_IDS.CLIENT_ACTIVE_3 },
		{ id: SEED_IDS.MEDICAL_CONSUMER_2, full_name: "Jane Roe", country_code: "+1", phone: "5554440002", client_id: SEED_IDS.CLIENT_ACTIVE_2 },
	];

	for (const consumer of CONSUMERS) {
		await prisma.vertical_medical_consumer.upsert({
			where: { id: consumer.id },
			update: consumer,
			create: consumer,
		});
		logger.info(`  Consumer "${consumer.full_name}" ready.`);
	}

	logger.info("Medical vertical seeding completed.");
};
