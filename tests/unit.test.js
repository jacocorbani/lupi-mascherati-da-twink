import { test } from "node:test";
import assert from "node:assert/strict";
import {
  username,
  emailFor,
  password,
  text,
  segments,
  pick,
  options,
  id,
  timestamp,
} from "../functions/domain.js";
import { planMigration, digest } from "../scripts/migration-plan.js";
test("username canonico e email tecnica stabile", () => {
  assert.equal(username("  AMICO.1 "), "amico.1");
  assert.equal(emailFor("AMICO.1"), "amico.1@members.combriccola.invalid");
  for (const value of ["a", "x@y.it", "../admin", "àmico", "<script>"])
    assert.throws(() => username(value));
});
test("password: limiti e nessuna normalizzazione silenziosa", () => {
  assert.equal(password("  frase lunga privata  "), "  frase lunga privata  ");
  assert.throws(() => password("breve"));
  assert.throws(() => password("x".repeat(129)));
});
test("limiti testo e identificativi", () => {
  assert.throws(() => text("x".repeat(5001), 5000));
  assert.throws(() => text({ admin: true }));
  assert.throws(() => id("../access/admin"));
  assert.throws(() => timestamp("domani"));
});
test("opzioni duplicate o fuori limite non valide", () => {
  assert.throws(() => options(["a"]));
  assert.throws(() => options(["a", "a"]));
  assert.throws(() => options(Array(13).fill("a")));
  assert.deepEqual(options(["a", "b"]), ["a", "b"]);
});
test("pesi validati e intervalli esatti della ruota", () => {
  const s = segments([
    { label: "A", weight: 2 },
    { label: "B", weight: 3 },
  ]);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((n) => pick(s, n)),
    [0, 0, 1, 1, 1],
  );
  for (const n of [0, -1, 1.5, Infinity, 10001])
    assert.throws(() =>
      segments([
        { label: "A", weight: n },
        { label: "B", weight: 1 },
      ]),
    );
});
test("migrazione deterministica, autori omonimi non attribuiti", () => {
  const backup = {
    groupId: "combriccola-principale",
    documents: [
      {
        path: "groups/combriccola-principale/diary/one",
        data: {
          author: "Nome uguale",
          text: "Ricordo",
          image: "data:image/png;base64,AQID",
        },
      },
      {
        path: "groups/combriccola-principale/members/old",
        data: { name: "Nome uguale" },
      },
    ],
  };
  const first = planMigration(backup),
    second = planMigration(backup);
  assert.deepEqual(first, second);
  assert.equal(
    first.items.find((x) => x.path.startsWith("diary/")).data.authorUid,
    null,
  );
  assert.equal(
    first.items.filter((x) => x.path.startsWith("historical/")).length,
    2,
  );
  assert.deepEqual(first.unmapped, ["old"]);
  assert.equal(first.sourceHash, digest(backup));
});
test("mapping non verificati, backup di altro gruppo e duplicati rifiutati", () => {
  const b = { groupId: "combriccola-principale", documents: [] };
  assert.throws(() => planMigration(b, { old: { uid: "new" } }));
  assert.throws(() => planMigration({ ...b, groupId: "other" }));
  const d = { path: "groups/combriccola-principale/members/a", data: {} };
  assert.throws(() => planMigration({ ...b, documents: [d, d] }));
});
