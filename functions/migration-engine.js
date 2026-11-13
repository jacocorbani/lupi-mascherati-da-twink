import { Timestamp } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

export const hash = (value) => createHash("sha256").update(value).digest("hex");
function revive(value) {
  if (value && typeof value === "object") {
    if ("_seconds" in value && "_nanoseconds" in value)
      return new Timestamp(value._seconds, value._nanoseconds);
    if (Array.isArray(value)) return value.map(revive);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, revive(v)]));
  }
  return value;
}
function canonical(value) {
  if (value instanceof Timestamp) return { _seconds: value.seconds, _nanoseconds: value.nanoseconds };
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const fingerprint = value => hash(JSON.stringify(canonical(value)));

// No deletes or overwrites. A journal event is persisted before each remote mutation.
export async function importPlan({ db, bucket, plan, record }) {
  const paths = new Set();
  for (const item of plan.items) {
    if (!/^(historical|diary)\/legacy_[a-f0-9]{32}$/.test(item.path) || paths.has(item.path))
      throw new Error("Percorso di destinazione non valido o duplicato.");
    paths.add(item.path);
    if (item.image && (!/^image\/(jpeg|png|webp)$/.test(item.image.contentType) ||
      Buffer.from(item.image.base64, "base64").length > 5242880))
      throw new Error("Immagine non valida o oltre limite.");
  }
  let created = 0, existingCount = 0;
  for (const item of plan.items) {
    const migrationHash = hash(JSON.stringify(item));
    const imagePath = item.image ? `media/migration/${item.path.split('/')[1]}` : null;
    const data = { ...revive(item.data), migrationHash, ...(imagePath ? { image: imagePath } : {}) };
    const ref = db.doc(item.path);
    const current = await ref.get();
    if (current.exists && fingerprint(current.data()) !== fingerprint(data))
      throw new Error(`Documento modificato o in conflitto: ${item.path}`);
    if (item.image) {
      const buffer = Buffer.from(item.image.base64, "base64");
      const imageHash = hash(buffer), object = bucket.file(imagePath);
      const [exists] = await object.exists();
      if (!exists) {
        await record({ kind: "image-pending", path: imagePath, hash: imageHash });
        try {
          await object.save(buffer, { resumable: false, metadata: { contentType: item.image.contentType },
            preconditionOpts: { ifGenerationMatch: 0 } });
        } catch (e) { if (Number(e.code) !== 412) throw e; }
      }
      const [bytes] = await object.download();
      const [metadata] = await object.getMetadata();
      if (hash(bytes) !== imageHash || metadata.contentType !== item.image.contentType)
        throw new Error(`Immagine in conflitto: ${imagePath}`);
      await record({ kind: exists ? "image-verified" : "image-created", path: imagePath,
        hash: imageHash, generation: metadata.generation });
    }
    if (current.exists) {
      existingCount++;
      await record({ kind: "document-verified", path: item.path, hash: migrationHash });
      continue;
    }
    await record({ kind: "document-pending", path: item.path, hash: migrationHash });
    await ref.create(data);
    const saved = await ref.get();
    if (fingerprint(saved.data()) !== fingerprint(data)) throw new Error(`Verifica fallita: ${item.path}`);
    created++;
    await record({ kind: "document-created", path: item.path, hash: migrationHash });
  }
  return { created, verified: existingCount, total: plan.items.length };
}
