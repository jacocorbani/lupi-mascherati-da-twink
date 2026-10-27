import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  initializeApp,
  deleteApp,
} from "../functions/node_modules/firebase-admin/lib/app/index.js";
import { getAuth } from "../functions/node_modules/firebase-admin/lib/auth/index.js";
import { getFirestore } from "../functions/node_modules/firebase-admin/lib/firestore/index.js";
let app, db, adminToken, memberToken, otherToken, memberUid, adminUid;
const project = "demo-combriccola",
  pw = "Synthetic-test-password-42";
async function login(name, password = pw) {
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `${name}@members.combriccola.invalid`,
        password,
        returnSecureToken: true,
      }),
    },
  );
  return r.json();
}
async function call(name, token, data) {
  const r = await fetch(
    `http://127.0.0.1:5001/${project}/europe-west1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data }),
    },
  );
  return r.json();
}
async function clearLimits() {
  const snap = await db.collection("limits").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}
before(async () => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw new Error("Solo emulatori.");
  app = initializeApp({ projectId: project });
  db = getFirestore(app);
  const auth = getAuth(app);
  for (const [name, isAdmin] of [
    ["test-admin", true],
    ["test-member", false],
    ["test-other", false],
  ]) {
    const u = await auth.createUser({
      email: `${name}@members.combriccola.invalid`,
      password: pw,
    });
    await auth.setCustomUserClaims(u.uid, {
      admin: isAdmin,
      sessionVersion: 1,
    });
    await db
      .doc(`access/${u.uid}`)
      .set({ active: true, mustChangePassword: false, sessionVersion: 1 });
    await db.doc(`members/${u.uid}`).set({ nickname: name });
    await db
      .doc(`privateMembers/${u.uid}`)
      .set({ username: name, realName: "Fittizio" });
    const token = (await login(name)).idToken;
    if (isAdmin) {
      adminUid = u.uid;
      adminToken = token;
    } else if (name === "test-member") {
      memberUid = u.uid;
      memberToken = token;
    } else otherToken = token;
  }
});
after(() => deleteApp(app));
test("anonimo e membro non possono creare account", async () => {
  assert.equal(
    (await call("createMember", null, {})).error.status,
    "UNAUTHENTICATED",
  );
  assert.equal(
    (await call("createMember", memberToken, {})).error.status,
    "PERMISSION_DENIED",
  );
});
test("creazione admin, cambio obbligatorio e password verificata da Firebase Auth", async () => {
  await clearLimits();
  const r = await call("createMember", adminToken, {
    username: "new-member",
    nickname: "Nuovo",
    realName: "Persona fittizia",
    password: pw,
  });
  assert.ok(r.result?.uid, JSON.stringify(r));
  const token = (await login("new-member")).idToken;
  assert.equal(
    (await call("saveDiary", token, { text: "non ancora" })).error.status,
    "PERMISSION_DENIED",
  );
  assert.equal(
    (
      await call("changePassword", token, {
        oldPassword: "wrong",
        newPassword: "New-synthetic-pass-42",
      })
    ).error.status,
    "UNAUTHENTICATED",
  );
  await clearLimits();
  const changed = await call("changePassword", token, {
    oldPassword: pw,
    newPassword: "New-synthetic-pass-42",
  });
  assert.equal(changed.result?.ok, true, JSON.stringify(changed));
  assert.ok((await login("new-member")).error);
  const fresh = await login("new-member", "New-synthetic-pass-42");
  assert.ok(fresh.idToken);
  assert.equal(
    (await call("saveDiary", token, { text: "old token" })).error.status,
    "PERMISSION_DENIED",
  );
  assert.ok(
    (await call("saveDiary", fresh.idToken, { text: "Primo ricordo" })).result
      ?.id,
  );
});
test("diario: proprietario stabile e cancellazione altrui negata", async () => {
  await clearLimits();
  const post = await call("saveDiary", memberToken, {
    text: "<img src=x onerror=alert(1)>",
  });
  assert.ok(post.result?.id, JSON.stringify(post));
  assert.equal(
    (await call("deleteDiary", otherToken, { id: post.result.id })).error
      .status,
    "PERMISSION_DENIED",
  );
  assert.equal(
    (
      await call("updateProfile", memberToken, {
        nickname: "Nuovo soprannome",
        avatar: null,
      })
    ).result?.ok,
    true,
  );
  assert.equal(
    (await db.doc(`diary/${post.result.id}`).get()).data().authorUid,
    memberUid,
  );
  assert.equal(
    (await call("deleteDiary", memberToken, { id: post.result.id })).result?.ok,
    true,
  );
});
test("sondaggi: indice falso, doppio voto e sondaggio chiuso negati", async () => {
  await clearLimits();
  const poll = await call("savePoll", adminToken, {
    question: "Dove?",
    options: ["Qui", "Là"],
  });
  const id = poll.result?.id;
  assert.ok(id, JSON.stringify(poll));
  assert.equal(
    (await call("vote", memberToken, { id, option: 8 })).error.status,
    "INVALID_ARGUMENT",
  );
  await clearLimits();
  assert.equal(
    (await call("vote", memberToken, { id, option: 0 })).result?.ok,
    true,
  );
  await clearLimits();
  assert.equal(
    (await call("vote", memberToken, { id, option: 1 })).error.status,
    "ALREADY_EXISTS",
  );
  assert.deepEqual((await db.doc(`polls/${id}`).get()).data().counts, [1, 0]);
  await call("savePoll", adminToken, { id });
  assert.equal(
    (await call("vote", otherToken, { id, option: 1 })).error.status,
    "INVALID_ARGUMENT",
  );
});
test("eventi: risposta legata al chiamante e limiti validati", async () => {
  await clearLimits();
  const r = await call("saveEvent", adminToken, {
    title: "Cena fittizia",
    description: "Test",
    location: "Staging",
    date: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.ok(r.result?.id, JSON.stringify(r));
  assert.equal(
    (
      await call("attend", memberToken, {
        id: r.result.id,
        response: "yes",
        uid: adminUid,
      })
    ).result?.ok,
    true,
  );
  assert.equal(
    (await db.doc(`events/${r.result.id}/attendance/${memberUid}`).get()).data()
      .response,
    "yes",
  );
});
test("classifiche: scrittura non amministrativa negata", async () => {
  assert.equal(
    (
      await call("saveRanking", memberToken, {
        name: "Hack",
        entries: [{ uid: memberUid, score: 999 }],
      })
    ).error.status,
    "PERMISSION_DENIED",
  );
  await clearLimits();
  assert.ok(
    (
      await call("saveRanking", adminToken, {
        name: "Test",
        entries: [{ uid: memberUid, score: 5 }],
      })
    ).result?.id,
  );
});
test("ruota: scelta server, pesi e risultato idempotente", async () => {
  await clearLimits();
  await call("saveWheel", adminToken, {
    segments: [
      { label: "A", weight: 1 },
      { label: "B", weight: 3 },
    ],
  });
  const first = await call("spin", memberToken, {
    requestId: "same-request",
    result: "Fake",
    index: 99,
  });
  assert.ok(["A", "B"].includes(first.result?.result), JSON.stringify(first));
  await clearLimits();
  const second = await call("spin", memberToken, { requestId: "same-request" });
  assert.equal(first.result.result, second.result.result);
  assert.equal((await db.collection("wheelSpins").get()).size, 1);
});
test("disattivazione revoca subito le operazioni con token precedente", async () => {
  await clearLimits();
  assert.equal(
    (
      await call("manageMember", adminToken, {
        uid: memberUid,
        action: "disable",
      })
    ).result?.ok,
    true,
  );
  assert.equal(
    (await call("saveDiary", memberToken, { text: "bloccato" })).error.status,
    "PERMISSION_DENIED",
  );
  assert.ok((await login("test-member")).error);
});
