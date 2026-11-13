import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFile, mkdir, open } from "node:fs/promises";
import { createRequire } from "node:module";
import { planMigration } from "../scripts/migration-plan.js";
import { hash, importPlan } from "./migration-engine.js";

const [backupFile, expectedHash, bucketName, mode] = process.argv.slice(2);
const projectId = "lupimacheratidatwink";
if (!backupFile || !/^[a-f0-9]{64}$/.test(expectedHash || ""))
  throw new Error("Uso: node functions/import-production.js BACKUP SHA256 BUCKET [--apply]");
const bytes = await readFile(backupFile);
if (hash(bytes) !== expectedHash) throw new Error("Hash backup non corrispondente.");
const backup = JSON.parse(bytes);
if (backup.projectId !== projectId) throw new Error("Backup di un altro progetto.");
// Identity mapping is intentionally absent: legacy authors remain historical.
const plan = planMigration(backup);
if (mode !== "--apply") {
  console.log(JSON.stringify({ mode: "dry-run", documents: plan.count,
    writes: plan.items.length, issues: plan.issues.length, unmapped: plan.unmapped.length }));
  process.exit(0);
}
if (process.env.MIGRATION_APPROVED_PROJECT !== projectId ||
    process.env.MIGRATION_CUTOVER_READY !== expectedHash ||
    ![`${projectId}.firebasestorage.app`, `${projectId}.appspot.com`].includes(bucketName))
  throw new Error("Progetto, bucket o checkpoint di rilascio non confermati.");
if (Object.keys(process.env).some(k => k.endsWith("EMULATOR_HOST") && process.env[k]))
  throw new Error("Rimuovere le variabili degli emulatori prima dell'importazione reale.");
const age = Date.now() - Date.parse(backup.exportedAt);
if (!Number.isFinite(age) || age < 0 || age > 3600000)
  throw new Error("Creare un backup nella finestra di passaggio (massimo un'ora).");
// Reuse the operator's Firebase CLI session; never write OAuth tokens to disk.
const root = createRequire(new URL("../package.json", import.meta.url));
const cli = createRequire(root.resolve("firebase-tools/package.json"));
const auth = cli("./lib/auth");
const account = auth.getGlobalDefaultAccount();
if (!account) throw new Error("Login Firebase operatore richiesto.");
initializeApp({ projectId, storageBucket: bucketName, credential: {
  async getAccessToken() {
    const token = await auth.getAccessToken(account.tokens.refresh_token, []);
    return { access_token: token.access_token, expires_in: token.expires_in || 3600 };
  }
} });
await mkdir("reports/private", { recursive: true });
const journal = await open(`reports/private/production-import-${Date.now()}.jsonl`, "wx");
const record = async event => { await journal.write(JSON.stringify({ at: new Date().toISOString(), ...event }) + "\n"); await journal.sync(); };
try {
  await record({ kind: "start", projectId, bucketName, backupHash: expectedHash, sourceHash: plan.sourceHash });
  const result = await importPlan({ db: getFirestore(), bucket: getStorage().bucket(), plan, record });
  await record({ kind: "complete", ...result });
  console.log(JSON.stringify(result));
} catch (e) {
  await record({ kind: "failed", message: e.message });
  throw e;
} finally { await journal.close(); }
