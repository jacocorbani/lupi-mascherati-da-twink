import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const projectId = process.argv[2];
if (!projectId) throw new Error("Specificare il project ID da leggere.");
initializeApp({ credential: applicationDefault(), projectId });
const documents = [];
async function walk(collection) {
  const snap = await collection.get();
  for (const d of snap.docs) {
    documents.push({ path: d.ref.path, data: d.data() });
    for (const child of await d.ref.listCollections()) await walk(child);
  }
}
const db = getFirestore();
const group = db.doc("groups/combriccola-principale"),
  root = await group.get();
for (const col of await group.listCollections()) await walk(col);
const output = JSON.stringify(
  {
    schema: 1,
    projectId,
    groupId: "combriccola-principale",
    exportedAt: new Date().toISOString(),
    root: root.exists ? root.data() : null,
    documents,
  },
  null,
  2,
);
await mkdir("../backups", { recursive: true });
const filename = `../backups/${projectId}-${Date.now()}.json`;
await writeFile(filename, output, { flag: "wx" });
await writeFile(
  `${filename}.sha256`,
  createHash("sha256").update(output).digest("hex"),
  { flag: "wx" },
);
console.log(
  `Backup di ${documents.length} documenti salvato con SHA-256. Proteggere il file: contiene dati personali.`,
);
