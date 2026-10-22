import { readFile, writeFile, mkdir } from "node:fs/promises";
import { planMigration, digest } from "./migration-plan.js";
const [backupFile, mappingFile] = process.argv.slice(2);
if (!backupFile)
  throw new Error("Uso: node scripts/migrate.js backup.json [mapping.json]");
const backup = JSON.parse(await readFile(backupFile, "utf8")),
  mapping = mappingFile ? JSON.parse(await readFile(mappingFile, "utf8")) : {};
const plan = planMigration(backup, mapping);
await mkdir("reports/private", { recursive: true });
await writeFile(
  "reports/private/migration-plan.json",
  JSON.stringify(plan, null, 2),
);
await writeFile(
  "reports/private/migration-summary.json",
  JSON.stringify(
    {
      sourceHash: plan.sourceHash,
      documents: plan.count,
      plannedWrites: plan.items.length,
      issues: plan.issues,
      unmapped: plan.unmapped,
    },
    null,
    2,
  ),
);
console.log(
  `Dry-run: ${plan.count} documenti, ${plan.items.length} scritture pianificate, ${plan.issues.length} anomalie. Nessuna scrittura remota.`,
);
