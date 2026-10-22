import { initializeApp } from "../functions/node_modules/firebase-admin/lib/app/index.js";
import { getAuth } from "../functions/node_modules/firebase-admin/lib/auth/index.js";
import {
  getFirestore,
  Timestamp,
} from "../functions/node_modules/firebase-admin/lib/firestore/index.js";
if (
  process.env.GCLOUD_PROJECT !== "demo-combriccola" ||
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw new Error("Solo emulatori demo.");
initializeApp({ projectId: "demo-combriccola" });
const auth = getAuth(),
  db = getFirestore();
const u = await auth.createUser({
  email: "preview-admin@members.combriccola.invalid",
  password: "Preview-only-password-42",
});
await auth.setCustomUserClaims(u.uid, { admin: true, sessionVersion: 1 });
await db
  .doc(`access/${u.uid}`)
  .set({ active: true, mustChangePassword: false, sessionVersion: 1 });
await db
  .doc(`members/${u.uid}`)
  .set({ nickname: "Viaggiatore", avatar: null, createdAt: Timestamp.now() });
await db
  .doc(`privateMembers/${u.uid}`)
  .set({
    username: "preview-admin",
    realName: "Persona di prova",
    createdAt: Timestamp.now(),
  });
await db
  .doc("diary/fixture")
  .set({
    authorUid: u.uid,
    text: "Un ricordo fittizio. <img src=x onerror=alert(1)>",
    image: null,
    createdAt: Timestamp.now(),
  });
await db.doc("wheel/config").set({
  segments: [
    { label: "Scegli la musica", weight: 1 },
    { label: "Porti il dolce", weight: 2 },
  ],
});
console.log("Account fittizio per collaudo UI pronto negli emulatori.");
