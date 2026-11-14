// Authorized read-only backup using the existing official Firebase CLI login.
// Tokens stay in memory. Only the named existing group is read.
const { createRequire } = require("node:module");
const { mkdir, writeFile, readFile } = require("node:fs/promises");
const { createHash } = require("node:crypto");
const rootRequire = createRequire(
  require.resolve("firebase-tools/package.json"),
);
const auth = rootRequire("./lib/auth");
const adminRequire = createRequire(
  require("node:path").resolve("functions/package.json"),
);
const firestoreRequire = createRequire(
  adminRequire.resolve("firebase-admin/firestore"),
);
const { Firestore } = firestoreRequire("@google-cloud/firestore");
const { OAuth2Client } = rootRequire("google-auth-library");
const projectId = "lupimacheratidatwink";
(async () => {
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error("Firebase CLI login richiesto.");
  const token = await auth.getAccessToken(account.tokens.refresh_token, []),
    authClient = new OAuth2Client();
  authClient.setCredentials({
    access_token: token.access_token,
    expiry_date: Date.now() + 3000000,
  });
  const db = new Firestore({ projectId, preferRest: true, authClient });
  const documents = [],
    counts = {};
  async function walk(col) {
    const snap = await col.get();
    counts[col.path] = snap.size;
    for (const d of snap.docs) {
      documents.push({ path: d.ref.path, data: d.data() });
      for (const nested of await d.ref.listCollections()) await walk(nested);
    }
  }
  const group = db.doc("groups/combriccola-principale"),
    root = await group.get();
  for (const col of await group.listCollections()) await walk(col);
  const filename = `backups/production-${Date.now()}.json`,
    payload = JSON.stringify(
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
  await mkdir("backups", { recursive: true });
  await writeFile(filename, payload, { flag: "wx" });
  const hash = createHash("sha256").update(payload).digest("hex");
  await writeFile(`${filename}.sha256`, hash, { flag: "wx" });
  const reread = await readFile(filename);
  if (createHash("sha256").update(reread).digest("hex") !== hash)
    throw new Error("Verifica backup fallita.");
  await mkdir("reports/private", { recursive: true });
  await writeFile(
    "reports/private/backup-summary.json",
    JSON.stringify(
      { filename, sha256: hash, documents: documents.length, counts },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        filename,
        sha256: hash,
        documents: documents.length,
        collectionCounts: Object.fromEntries(
          Object.entries(counts).map(([p, n]) => [
            p.includes("/responses") ? "questionnaires/responses" : p,
            n,
          ]),
        ),
      },
      null,
      2,
    ),
  );
  await db.terminate();
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
