const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("./src/db/prisma/index.js");

const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname, port: parseInt(dbUrl.port || "3306"),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });
const BOX_ID = "01CAMPINGBOX123456789012345";

async function main() {
  let telemetry = await prisma.telemetry.findFirst({ where: { box_id: BOX_ID } });
  if (telemetry) {
    await prisma.telemetry.update({
      where: { id: telemetry.id },
      data: { camera_status: "on", connection_status: "connected" },
    });
    console.log("Telemetry updated: camera_status=on, connection_status=connected");
  } else {
    const { ulid } = require("ulid");
    await prisma.telemetry.create({
      data: {
        id: ulid(),
        box_id: BOX_ID,
        camera_status: "on",
        connection_status: "connected",
      },
    });
    console.log("Telemetry created: camera_status=on, connection_status=connected");
  }
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
