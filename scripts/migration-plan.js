import { createHash } from "node:crypto";
export const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const known = new Set([
  "members",
  "diary",
  "polls",
  "questionnaires",
  "streakEvents",
  "queueWaits",
  "wheel",
  "wheelSpins",
]);
// Input: recursive export of groups/combriccola-principale, never an assumed empty DB.
export function planMigration(backup, mapping = {}) {
  if (
    backup.groupId !== "combriccola-principale" ||
    !Array.isArray(backup.documents)
  )
    throw new Error("Backup non riconosciuto.");
  const seen = new Set(),
    report = {
      sourceHash: digest(backup),
      count: backup.documents.length,
      items: [],
      issues: [],
      unmapped: [],
    };
  for (const [legacy, entry] of Object.entries(mapping))
    if (
      !entry?.verified ||
      typeof entry.uid !== "string" ||
      !entry.verifiedBy ||
      !entry.verifiedAt
    )
      throw new Error(`Mapping non verificato: ${legacy}`);
  for (const item of backup.documents) {
    if (
      typeof item.path !== "string" ||
      !item.path.startsWith("groups/combriccola-principale/") ||
      !item.data
    )
      throw new Error("Documento fuori gruppo o malformato.");
    if (seen.has(item.path)) throw new Error("Percorso duplicato nel backup.");
    seen.add(item.path);
    const parts = item.path.split("/"),
      kind = parts[2],
      key = `legacy_${digest(item.path).slice(0, 32)}`;
    // Always preserve a complete original in an admin-only historical archive.
    report.items.push({
      path: `historical/${key}`,
      data: {
        sourcePath: item.path,
        sourceHash: digest(item.data),
        legacy: item.data,
      },
      source: item.path,
    });
    if (!known.has(kind))
      report.issues.push({
        path: item.path,
        reason: "Collezione sconosciuta: conservata in archivio per revisione.",
      });
    if (kind === "members" && !mapping[parts[3]])
      report.unmapped.push(parts[3]);
    if (kind === "diary" && parts.length === 4) {
      const original = item.data;
      // Old diary stores author names, not member IDs: never infer identity from a name.
      const match = mapping[`diary:${parts[3]}`];
      const data = {
        text: typeof original.text === "string" ? original.text : "",
        authorUid: match?.uid || null,
        createdAt: original.createdAt || null,
        updatedAt: original.createdAt || null,
        image: null,
        historical: true,
        sourcePath: item.path,
      };
      const image = original.image;
      const imageMatch =
        typeof image === "string"
          ? /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(image)
          : null;
      if (image && !imageMatch)
        report.issues.push({
          path: item.path,
          reason:
            "Immagine non convertibile automaticamente; originale preservato.",
        });
      report.items.push({
        path: `diary/${key}`,
        data,
        source: item.path,
        ...(imageMatch
          ? {
              image: {
                contentType: `image/${imageMatch[1]}`,
                base64: imageMatch[2],
              },
            }
          : {}),
      });
    }
    if (kind === "polls")
      report.issues.push({
        path: item.path,
        reason:
          "Voti legacy non autenticati: conservati in archivio, non sommati a voti v2.",
      });
    if (kind === "streakEvents")
      report.issues.push({
        path: item.path,
        reason:
          "Solo conteggio presenze: nessun elenco personale ricostruibile.",
      });
  }
  return report;
}
