import { createPool } from "mariadb";

const DB_ADMIN_PASSWORD = process.env.AIVEN_ADMIN_PASSWORD;
if (!DB_ADMIN_PASSWORD) {
  console.log("AIVEN_ADMIN_PASSWORD not set, skipping idle connection cleanup");
  process.exit(0);
}

// Parse DATABASE_URL for host/port
const dbUrl = process.env.DATABASE_URL || "";
const afterAt = dbUrl.split("@")[1] || "";
const host = afterAt.split(":")[0];
const portStr = afterAt.split(":")[1] || "";
const port = parseInt(portStr.split("/")[0] || "3306");

async function main() {
  const pool = createPool({
    host,
    port,
    user: "avnadmin",
    password: DB_ADMIN_PASSWORD,
    database: "defaultdb",
    ssl: true,
    connectionLimit: 1,
    acquireTimeout: 5000,
  });
  const conn = await pool.getConnection();
  const rows = await conn.query("SHOW PROCESSLIST");
  let killed = 0;
  for (const r of rows) {
    if (r.Command === "Sleep" && r.Time > 0) {
      try {
        await conn.query(`KILL CONNECTION ${r.Id}`);
        killed++;
      } catch {}
    }
  }
  console.log(`Killed ${killed} idle connections`);
  await conn.end();
  await pool.end();
}

main().catch((e) => {
  console.error("Failed to kill idle connections:", e.message);
  process.exit(1);
});
