import { test, before, after } from "node:test";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-combriccola",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
    storage: { rules: await readFile("storage.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, active, temporary] of [
      ["alice", true, false],
      ["bob", true, false],
      ["disabled", false, false],
      ["temporary", true, true],
      ["admin", true, false],
    ]) {
      await setDoc(doc(db, "access", uid), {
        active,
        mustChangePassword: temporary,
        sessionVersion: 1,
      });
      await setDoc(doc(db, "members", uid), { nickname: uid });
      await setDoc(doc(db, "privateMembers", uid), {
        realName: "Persona fittizia",
      });
    }
    await setDoc(doc(db, "diary", "post"), {
      authorUid: "alice",
      text: "Ricordo",
    });
    await uploadBytes(
      ref(ctx.storage(), "media/alice/photo"),
      new Uint8Array([1, 2, 3]),
      { contentType: "image/png" },
    );
  });
});
after(() => env?.cleanup());
const ctx = (uid, extra = {}) =>
  env.authenticatedContext(uid, { sessionVersion: 1, admin: false, ...extra });
test("anonimo: dati e foto riservati negati", async () => {
  const c = env.unauthenticatedContext();
  await assertFails(getDocs(collection(c.firestore(), "diary")));
  await assertFails(getBytes(ref(c.storage(), "media/alice/photo")));
});
test("membro: legge soprannomi, solo il proprio nome reale", async () => {
  const db = ctx("alice").firestore();
  await assertSucceeds(getDocs(collection(db, "members")));
  await assertSucceeds(getDoc(doc(db, "privateMembers", "alice")));
  await assertFails(getDoc(doc(db, "privateMembers", "bob")));
  await assertFails(getDocs(collection(db, "privateMembers")));
});
test("admin: nomi privati accessibili", async () => {
  await assertSucceeds(
    getDocs(
      collection(ctx("admin", { admin: true }).firestore(), "privateMembers"),
    ),
  );
});
test("modifica ruolo, accesso e punteggi negata", async () => {
  const db = ctx("alice").firestore();
  for (const path of [
    "access/alice",
    "members/alice",
    "rankings/test",
    "polls/test/votes/bob",
    "polls/test",
  ])
    await assertFails(setDoc(doc(db, path), { admin: true, score: 999 }));
});
test("scritture dirette negate anche admin", async () => {
  await assertFails(
    setDoc(doc(ctx("admin", { admin: true }).firestore(), "diary/test"), {
      text: "iniezione",
    }),
  );
});
test("disabilitato, temporaneo e token obsoleto: accesso negato", async () => {
  for (const c of [
    ctx("disabled"),
    ctx("temporary"),
    ctx("alice", { sessionVersion: 0 }),
  ]) {
    await assertFails(getDoc(doc(c.firestore(), "diary/post")));
    await assertFails(getBytes(ref(c.storage(), "media/alice/photo")));
  }
});
test("eliminazione post altrui negata", async () => {
  await assertFails(deleteDoc(doc(ctx("bob").firestore(), "diary/post")));
});
test("account auto-registrato senza enrollment negato", async () => {
  await assertFails(
    getDocs(collection(ctx("stranger").firestore(), "members")),
  );
});
test("Storage: upload proprio consentito, altro proprietario e SVG negati", async () => {
  const s = ctx("alice").storage();
  await assertSucceeds(
    uploadBytes(ref(s, "media/alice/new"), new Uint8Array([1]), {
      contentType: "image/png",
    }),
  );
  await assertFails(
    uploadBytes(ref(s, "media/bob/new"), new Uint8Array([1]), {
      contentType: "image/png",
    }),
  );
  await assertFails(
    uploadBytes(ref(s, "media/alice/script"), new Uint8Array([1]), {
      contentType: "image/svg+xml",
    }),
  );
  await assertFails(
    uploadBytes(ref(s, "media/alice/large"), new Uint8Array(5242881), {
      contentType: "image/png",
    }),
  );
});
test("Storage: sovrascrittura ed eliminazione altrui negate", async () => {
  await assertFails(
    uploadBytes(
      ref(ctx("alice").storage(), "media/alice/photo"),
      new Uint8Array([9]),
      { contentType: "image/png" },
    ),
  );
  await assertFails(
    deleteObject(ref(ctx("bob").storage(), "media/alice/photo")),
  );
});
test("vecchi percorsi sempre negati", async () => {
  await assertFails(
    getDocs(
      collection(
        ctx("alice").firestore(),
        "groups/combriccola-principale/members",
      ),
    ),
  );
});
