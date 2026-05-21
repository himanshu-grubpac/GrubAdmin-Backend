import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { CLIENT_IDS } from "./seed-clients";
import { RESTAURANT_IDS } from "./seed-restaurants";
import { BOX_IDS } from "./seed-boxes";

export const EMPLOYEE_IDS = {
  MANAGER_1: "seed-emp-mgr-1",
  MANAGER_2: "seed-emp-mgr-2",
  DELIVERY_1: "seed-emp-del-1",
  DELIVERY_2: "seed-emp-del-2",
  SUSPENDED: "seed-emp-suspended",
  UNASSIGNED: "seed-emp-unassigned",
  MEDICAL_DELIVERY: "seed-emp-med-del-1",
} as const;

interface EmployeeSeedDef {
  id: string;
  first_name: string;
  last_name: string;
  country_code: string;
  mobile_number: string;
  email: string;
  employee_display_id: string;
  client_id: string;
  restaurant_id: string | null;
  role: "manager" | "delivery";
  status: "active" | "suspended" | "unassigned";
  assigned_box_ids?: string[];
  connected_box_id?: string | null;
}

const EMPLOYEES: EmployeeSeedDef[] = [
  {
    id: EMPLOYEE_IDS.MANAGER_1,
    first_name: "Marco",
    last_name: "Rossi",
    country_code: "+1",
    mobile_number: "5556667788",
    email: "marco.rossi@bellaitalia.com",
    employee_display_id: "EMP-MGR-001",
    client_id: CLIENT_IDS.ACTIVE_1,
    restaurant_id: RESTAURANT_IDS.ACTIVE_1,
    role: "manager",
    status: "active",
    assigned_box_ids: [BOX_IDS.BOX_001, BOX_IDS.BOX_002],
  },
  {
    id: EMPLOYEE_IDS.DELIVERY_1,
    first_name: "Luigi",
    last_name: "Verdi",
    country_code: "+1",
    mobile_number: "5557778899",
    email: "luigi.verdi@bellaitalia.com",
    employee_display_id: "EMP-DEL-001",
    client_id: CLIENT_IDS.ACTIVE_1,
    restaurant_id: RESTAURANT_IDS.ACTIVE_1,
    role: "delivery",
    status: "active",
    assigned_box_ids: [BOX_IDS.BOX_001, BOX_IDS.BOX_002],
    connected_box_id: BOX_IDS.BOX_001,
  },
  {
    id: EMPLOYEE_IDS.MANAGER_2,
    first_name: "Sarah",
    last_name: "Green",
    country_code: "+1",
    mobile_number: "5558889900",
    email: "sarah.green@greenleaf.com",
    employee_display_id: "EMP-MGR-002",
    client_id: CLIENT_IDS.ACTIVE_2,
    restaurant_id: RESTAURANT_IDS.ACTIVE_2,
    role: "manager",
    status: "active",
    assigned_box_ids: [BOX_IDS.BOX_003, BOX_IDS.BOX_004],
  },
  {
    id: EMPLOYEE_IDS.DELIVERY_2,
    first_name: "Tom",
    last_name: "Baker",
    country_code: "+1",
    mobile_number: "5559990011",
    email: "tom.baker@greenleaf.com",
    employee_display_id: "EMP-DEL-002",
    client_id: CLIENT_IDS.ACTIVE_2,
    restaurant_id: RESTAURANT_IDS.ACTIVE_3,
    role: "delivery",
    status: "active",
    assigned_box_ids: [BOX_IDS.BOX_003],
    connected_box_id: BOX_IDS.BOX_003,
  },
  {
    id: EMPLOYEE_IDS.SUSPENDED,
    first_name: "Jack",
    last_name: "Sparrow",
    country_code: "+1",
    mobile_number: "5550001122",
    email: "jack.sparrow@bellaitalia.com",
    employee_display_id: "EMP-SUS-001",
    client_id: CLIENT_IDS.ACTIVE_1,
    restaurant_id: RESTAURANT_IDS.ACTIVE_1,
    role: "delivery",
    status: "suspended",
  },
  {
    id: EMPLOYEE_IDS.UNASSIGNED,
    first_name: "Pending",
    last_name: "Hire",
    country_code: "+1",
    mobile_number: "5551112234",
    email: "pending.hire@greenleaf.com",
    employee_display_id: "EMP-UNAS-001",
    client_id: CLIENT_IDS.ACTIVE_2,
    restaurant_id: null,
    role: "delivery",
    status: "unassigned",
  },
  {
    id: EMPLOYEE_IDS.MEDICAL_DELIVERY,
    first_name: "Emily",
    last_name: "Nurse",
    country_code: "+1",
    mobile_number: "5552223345",
    email: "emily.nurse@mediquick.com",
    employee_display_id: "EMP-MED-001",
    client_id: CLIENT_IDS.ACTIVE_3,
    restaurant_id: null,
    role: "delivery",
    status: "active",
    assigned_box_ids: [BOX_IDS.BOX_005],
    connected_box_id: BOX_IDS.BOX_005,
  },
];

export const seedEmployees = async (): Promise<void> => {
  logger.info("Seeding food employees...");

  for (const empDef of EMPLOYEES) {
    const byId = await prisma.vertical_food_employee.findUnique({ where: { id: empDef.id } });
    const byDisplayId = await prisma.vertical_food_employee.findUnique({
      where: { employee_display_id: empDef.employee_display_id },
    });
    if (byId || byDisplayId) {
      logger.info(`  Employee "${empDef.first_name} ${empDef.last_name}" already exists.`);
      continue;
    }

    const { assigned_box_ids, connected_box_id, ...empData } = empDef;

    const employee = await prisma.vertical_food_employee.create({ data: empData });

    if (assigned_box_ids && assigned_box_ids.length > 0) {
      await prisma.vertical_food_employee_box.createMany({
        data: assigned_box_ids.map((boxId) => ({
          employee_id: employee.id,
          box_id: boxId,
          status: "shared",
          access: "direct",
        })),
      });
    }

    if (connected_box_id) {
      await prisma.box.update({
        where: { id: connected_box_id },
        data: { connection_employee_id: employee.id },
      });
    }

    logger.info(`  Employee "${empDef.first_name} ${empDef.last_name}" created with assignments.`);
  }

  logger.info(`Seeded ${EMPLOYEES.length} food employees.`);
};
