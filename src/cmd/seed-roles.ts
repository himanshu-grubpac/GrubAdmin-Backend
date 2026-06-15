import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { getAllPermissions } from "@/configs/constants";
import { SEED_IDS } from "./seed-ids";

const ROLES = [
  {
    id: SEED_IDS.ROLE_SUPER_ADMIN,
    name: "Super Admin",
    name_normalized: "super admin",
    is_super_admin: true,
    permissions_json: getAllPermissions(),
  },
  {
    id: SEED_IDS.ROLE_ADMIN,
    name: "Admin",
    name_normalized: "admin",
    is_super_admin: false,
    permissions_json: {
      dashboard: ["view dashboard", "export dashboard"],
      employees: [
        "view active employees", "view employee logs", "view suspended employees",
        "view dismissed employees", "add employees", "edit employees",
        "delete employees", "suspend employees", "active employees", "export employees",
      ],
      roles: ["view roles", "edit roles", "add roles", "delete roles"],
      clients: [
        "view clients list", "export clients list", "view clients log",
        "view client account", "add new entries", "edit entries",
        "suspend entries", "delete entries", "export entries", "edit profile details",
      ],
      support: [
        "view active resources", "export active resources", "add new category",
        "edit category", "suspend categories", "delete categories",
        "view suspended categories", "export suspended_categories",
        "activate categories", "add new question", "edit questions",
        "change faq category", "allow publishing", "delete question",
      ],
      system_settings: ["view configs", "edit configs"],
      grubpac: [
        "view grubpacs", "add grubpacs", "edit grubpacs",
        "delete grubpacs", "assign grubpacs", "export grubpacs",
      ],
      verticals: {
        camping: "camping", medical: "medical", delivery: "delivery",
        hospitality: "hospitality", view_verticals: "view verticals",
        add_verticals: "add verticals",
      },
    },
  },
  {
    id: SEED_IDS.ROLE_SUPPORT_MANAGER,
    name: "Support Manager",
    name_normalized: "support manager",
    is_super_admin: false,
    permissions_json: {
      dashboard: ["view dashboard"],
      support: [
        "view active resources", "export active resources", "add new category",
        "edit category", "add new question", "edit questions",
        "change faq category", "allow publishing", "delete question",
      ],
    },
  },
  {
    id: SEED_IDS.ROLE_VIEWER,
    name: "Viewer",
    name_normalized: "viewer",
    is_super_admin: false,
    permissions_json: {
      dashboard: ["view dashboard"],
      employees: ["view active employees"],
      roles: ["view roles"],
      clients: ["view clients list", "view client account"],
      support: ["view active resources"],
      grubpac: ["view grubpacs"],
    },
  },
];

export const seedRoles = async (): Promise<Record<string, string>> => {
  logger.info("Seeding roles...");
  const seededRoles: Record<string, string> = {};
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { id: roleDef.id },
      update: {
        name: roleDef.name,
        permissions_json: roleDef.permissions_json,
        is_super_admin: roleDef.is_super_admin,
      },
      create: {
        id: roleDef.id,
        name: roleDef.name,
        name_normalized: roleDef.name_normalized,
        is_super_admin: roleDef.is_super_admin,
        permissions_json: roleDef.permissions_json,
      },
    });
    seededRoles[roleDef.name_normalized] = role.id;
    logger.info(`  Role "${roleDef.name}" ready.`);
  }
  logger.info(`Seeded ${ROLES.length} roles.`);
  return seededRoles;
};
