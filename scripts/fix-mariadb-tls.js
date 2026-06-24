import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const files = [
  {
    path: resolve(root, "node_modules/mariadb/lib/cmd/handshake/auth/handshake.js"),
    search: 'info.tlsFingerprint = serverCert ? serverCert.fingerprint256.replace(/:/gi, \'\').toLowerCase() : null;',
    replace: 'info.tlsFingerprint = serverCert && serverCert.fingerprint256 ? serverCert.fingerprint256.replace(/:/gi, \'\').toLowerCase() : null;',
  },
  {
    path: resolve(root, "node_modules/mariadb/dist/promise.cjs"),
    search: 'n.tlsFingerprint=A?A.fingerprint256.replace(/:/gi,"").toLowerCase():null',
    replace: 'n.tlsFingerprint=A&&A.fingerprint256?A.fingerprint256.replace(/:/gi,"").toLowerCase():null',
  },
];

for (const file of files) {
  try {
    let content = readFileSync(file.path, "utf-8");
    if (content.includes(file.replace)) {
      console.log(`[OK] Already patched: ${file.path}`);
      continue;
    }
    if (!content.includes(file.search)) {
      console.error(`[SKIP] Pattern not found in: ${file.path}`);
      continue;
    }
    content = content.replace(file.search, file.replace);
    writeFileSync(file.path, content, "utf-8");
    console.log(`[PATCHED] ${file.path}`);
  } catch (err) {
    console.error(`[ERROR] ${file.path}: ${err.message}`);
  }
}
