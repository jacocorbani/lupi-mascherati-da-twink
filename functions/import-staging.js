import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const [file] = process.argv.slice(2),
  projectId = process.env.GCLOUD_PROJECT;
// Deliberately cannot write to production. Production migration needs a reviewed operator tool.
if (
  !projectId?.startsWith("demo-") ||
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_STORAGE_EMULATOR_HOST
)
  throw new Error(
    "Importazione consentita esclusivamente negli emulatori demo.",
  );
initializeApp({ projectId, storageBucket: `${projectId}.appspot.com` });
const db = getFirestore(),
  plan = JSON.parse(await readFile(file, "utf8")),
  journal = [];
function revive(value) {
  if (value && typeof value === "object") {
    if ("_seconds" in value && "_nanoseconds" in value)
      return new Timestamp(value._seconds, value._nanoseconds);
    if (Array.isArray(value)) return value.map(revive);
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, revive(v)]),
    );
  }
  return value;
}
for (const item of plan.items) {
  const hash = createHash("sha256").update(JSON.stringify(item)).digest("hex");
  const ref = db.doc(item.path),
    existing = await ref.get();
  if (existing.exists) {
    if (existing.data().migrationHash !== hash)
      throw new Error(`Conflitto da revisionare: ${item.path}`);
    journal.push({ path: item.path, status: "already-present", hash });
    continue;
  }
  let data = { ...revive(item.data), migrationHash: hash };
  if (item.image) {
    const buffer = Buffer.from(item.image.base64, "base64");
    if (buffer.length > 5242880)
      throw new Error("Immagine oltre limite: rivedere il piano.");
    const path = `media/migration/${ref.id}`;
    await getStorage()
      .bucket()
      .file(path)
      .save(buffer, {
        metadata: { contentType: item.image.contentType },
        preconditionOpts: { ifGenerationMatch: 0 },
      })
      .catch((e) => {
        if (e.code !== 412) throw e;
      });
    data.image = path;
  }
  await ref.create(data);
  journal.push({ path: item.path, status: "created", hash });
  await writeFile(`${file}.journal.json`, JSON.stringify(journal, null, 2));
}
await writeFile(
  `${file}.journal-${Date.now()}.json`,
  JSON.stringify(journal, null, 2),
);
console.log(
  `Importazione emulatori completata: ${journal.length} voci. Nessuna eliminazione.`,
);
