import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { planMigration } from "../scripts/migration-plan.js";
import { createRequire } from "node:module";
import { importPlan, hash } from "../functions/migration-engine.js";
const admin = createRequire(new URL("../functions/package.json", import.meta.url));

test("importatore produzione: dry-run offline e blocco senza checkpoint", async () => {
  const file = "reports/private/synthetic-production-backup.json";
  await mkdir("reports/private", { recursive: true });
  const bytes = JSON.stringify({ projectId: "lupimacheratidatwink", groupId: "combriccola-principale", exportedAt: new Date().toISOString(), documents: [] });
  await writeFile(file, bytes);
  const args = ["functions/import-production.js", file, hash(bytes), "lupimacheratidatwink.firebasestorage.app"];
  const out = execFileSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(JSON.parse(out).mode, "dry-run");
  assert.throws(() => execFileSync(process.execPath, [...args, "--apply"], { stdio: "pipe", env: { ...process.env, MIGRATION_APPROVED_PROJECT: "", MIGRATION_CUTOVER_READY: "" } }));
  assert.throws(() => execFileSync(process.execPath, [args[0], file, "0".repeat(64), args[3]], { stdio: "pipe" }));
});

test("motore migrazione: ripresa dopo interruzione, contenuto e immagini verificati", async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error("Solo emulatori.");
  const app = admin("firebase-admin/app").initializeApp({ projectId: "demo-combriccola", storageBucket: "demo-combriccola.appspot.com" }, "migration-engine-test");
  const db = admin("firebase-admin/firestore").getFirestore(app);
  const bucket = admin("firebase-admin/storage").getStorage(app).bucket();
  const plan = planMigration({ groupId: "combriccola-principale", documents: [{
    path: "groups/combriccola-principale/diary/engine-fixture", data: { text: "Fittizio", createdAt: { _seconds: 1700000000, _nanoseconds: 0 }, image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=" }
  }] });
  const journal = [];
  try {
    await assert.rejects(importPlan({ db, bucket, plan, record: async e => { journal.push(e); if (e.kind === "image-created") throw Error("Interruzione simulata"); } }), /Interruzione/);
    const resumed = await importPlan({ db, bucket, plan, record: async e => journal.push(e) });
    assert.equal(resumed.created, 1);
    assert.equal(resumed.verified, 1);
    const again = await importPlan({ db, bucket, plan, record: async () => {} });
    assert.equal(again.created, 0);
    const diary = plan.items.find(i => i.path.startsWith("diary/"));
    await db.doc(diary.path).update({ text: "Modificato dopo la migrazione" });
    await assert.rejects(importPlan({ db, bucket, plan, record: async () => {} }), /conflitto/);
    await db.doc(diary.path).update({ text: "Fittizio" });
    const imagePath = `media/migration/${diary.path.split('/')[1]}`;
    await bucket.file(imagePath).save(Buffer.from("corrotto"), { metadata: { contentType: "image/png" } });
    await assert.rejects(importPlan({ db, bucket, plan, record: async () => {} }), /Immagine in conflitto/);
    await assert.rejects(importPlan({ db, bucket, plan: { items: [{ path: "access/admin", data: {} }] }, record: async () => {} }), /Percorso/);
  } finally { await admin("firebase-admin/app").deleteApp(app); }
});
test("importazione staging: immagini, autori ignoti e seconda esecuzione senza duplicati", async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Solo emulatori.");
  const backup = {
    groupId: "combriccola-principale",
    documents: [
      {
        path: "groups/combriccola-principale/members/fictional-member",
        data: { name: "Persona inventata" },
      },
      {
        path: "groups/combriccola-principale/diary/fictional-post",
        data: {
          author: "Persona inventata",
          text: "Un ricordo fittizio",
          createdAt: { _seconds: 1700000000, _nanoseconds: 0 },
          image:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=",
        },
      },
    ],
  };
  const plan = planMigration(backup);
  await mkdir("reports/private", { recursive: true });
  const file = "reports/private/synthetic-plan.json";
  await writeFile(file, JSON.stringify(plan));
  const env = {
    ...process.env,
    GCLOUD_PROJECT: "demo-combriccola",
    FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  };
  execFileSync(process.execPath, ["functions/import-staging.js", file], {
    env,
    stdio: "pipe",
  });
  const first = JSON.parse(await readFile(`${file}.journal.json`));
  assert.equal(first.length, 3);
  assert.ok(first.every((x) => x.status === "created"));
  execFileSync(process.execPath, ["functions/import-staging.js", file], {
    env,
    stdio: "pipe",
  });
  // The rolling first-run journal is retained because the second run creates nothing.
  assert.deepEqual(JSON.parse(await readFile(`${file}.journal.json`)), first);
  const altered = structuredClone(plan);
  altered.items[0].data.legacy.name = "Conflitto";
  await writeFile(file, JSON.stringify(altered));
  assert.throws(() =>
    execFileSync(process.execPath, ["functions/import-staging.js", file], {
      env,
      stdio: "pipe",
    }),
  );
});
