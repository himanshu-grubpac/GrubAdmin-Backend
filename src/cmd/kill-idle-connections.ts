import { createConnection } from "mariadb";
import { DATABASE_URL } from "@/configs/env";

async function main() {
  const conn = await createConnection(DATABASE_URL);
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
  console.log(`Cleaned up ${killed} idle connections`);
  await conn.end();
}

main();
