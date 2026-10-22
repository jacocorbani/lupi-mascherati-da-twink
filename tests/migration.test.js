import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { planMigration } from "../scripts/migration-plan.js";
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
