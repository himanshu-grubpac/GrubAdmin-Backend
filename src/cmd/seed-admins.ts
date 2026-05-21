import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { Bcrypt } from "@/utils/bcrypt";

interface SeedAdminsArgs {
  roleIds: Record<string, string>;
}

export const ADMIN_IDS = {
  SUPER: "seed-admin-super",
  ADMIN_ONE: "seed-admin-one",
  ADMIN_TWO: "seed-admin-two",
  SUPPORT: "seed-admin-support",
  VIEWER: "seed-admin-viewer",
} as const;

const DEFAULT_PASSWORD = "Qwerty@54321";

export const seedAdmins = async (args: SeedAdminsArgs): Promise<{ id: string; name: string }> => {
  const { roleIds } = args;
  logger.info("Seeding admin users...");

  const hashedPassword = await Bcrypt.generateHash({ data: DEFAULT_PASSWORD, saltLength: 10 });

  const getRoleId = (normalizedName: string): string => {
    const id = roleIds[normalizedName];
    if (!id) {
      throw new Error(`Role ID not found for "${normalizedName}"`);
    }
    return id;
  };

  const adminsToSeed = [
    {
      id: ADMIN_IDS.SUPER,
      first_name: "Rahul",
      last_name: "Jha",
      email: "rahul.jha.work7@gmail.com",
      role_id: getRoleId("super admin"),
      country_code: "+1",
      mobile_number: "5551234567",
      status: "active" as const,
      employee_id: "EMP-SUPER-001",
    },
    {
      id: ADMIN_IDS.ADMIN_ONE,
      first_name: "Alice",
      last_name: "Johnson",
      email: "alice.johnson@grubpac.com",
      role_id: getRoleId("admin"),
      country_code: "+1",
      mobile_number: "5552345678",
      status: "active" as const,
      employee_id: "EMP-ADMIN-001",
    },
    {
      id: ADMIN_IDS.ADMIN_TWO,
      first_name: "Bob",
      last_name: "Smith",
      email: "bob.smith@grubpac.com",
      role_id: getRoleId("admin"),
      country_code: "+1",
      mobile_number: "5553456789",
      status: "active" as const,
      employee_id: "EMP-ADMIN-002",
    },
    {
      id: ADMIN_IDS.SUPPORT,
      first_name: "Charlie",
      last_name: "Brown",
      email: "charlie.brown@grubpac.com",
      role_id: getRoleId("support manager"),
      country_code: "+1",
      mobile_number: "5554567890",
      status: "active" as const,
      employee_id: "EMP-SUPPORT-001",
    },
    {
      id: ADMIN_IDS.VIEWER,
      first_name: "Diana",
      last_name: "Prince",
      email: "diana.prince@grubpac.com",
      role_id: getRoleId("viewer"),
      country_code: "+1",
      mobile_number: "5555678901",
      status: "active" as const,
      employee_id: "EMP-VIEWER-001",
    },
  ];

  let superAdminId = "";
  let superAdminName = "";

  for (const admin of adminsToSeed) {
    const byEmail = await prisma.admin.findUnique({ where: { email: admin.email } });
    const byEmployeeId = await prisma.admin.findUnique({ where: { employee_id: admin.employee_id } });

    if (!byEmail && !byEmployeeId) {
      const created = await prisma.admin.create({ data: { ...admin, password: hashedPassword } });
      logger.info(`  Admin "${admin.first_name} ${admin.last_name}" created.`);
      if (admin.role_id === getRoleId("super admin")) {
        superAdminId = created.id;
        superAdminName = `${created.first_name} ${created.last_name || ""}`.trim();
      }
    } else {
      const existing = byEmail || byEmployeeId;
      logger.info(`  Admin "${admin.first_name} ${admin.last_name}" already exists.`);
      if (admin.role_id === getRoleId("super admin")) {
        superAdminId = existing!.id;
        superAdminName = `${existing!.first_name} ${existing!.last_name || ""}`.trim();
      }
    }
  }

  logger.info(`Seeded ${adminsToSeed.length} admin users.`);
  return { id: superAdminId, name: superAdminName };
};
