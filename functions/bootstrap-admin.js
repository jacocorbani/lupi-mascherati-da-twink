import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { emailFor, username, password, text } from "./domain.js";
const projectId = process.env.GCLOUD_PROJECT;
if (!projectId) throw new Error("Specificare GCLOUD_PROJECT.");
if (
  !process.env.FIREBASE_AUTH_EMULATOR_HOST &&
  process.env.APPROVE_ADMIN_BOOTSTRAP !== projectId
)
  throw new Error("Richiede approvazione operatore esplicita per il progetto.");
const name = username(process.env.ADMIN_USERNAME),
  pw = password(process.env.ADMIN_INITIAL_PASSWORD),
  real = text(process.env.ADMIN_REAL_NAME, 100),
  nick = text(process.env.ADMIN_NICKNAME, 50);
initializeApp({
  projectId,
  ...(!process.env.FIREBASE_AUTH_EMULATOR_HOST
    ? { credential: applicationDefault() }
    : {}),
});
const auth = getAuth(),
  db = getFirestore();
const user = await auth.createUser({
  email: emailFor(name),
  password: pw,
  disabled: true,
});
await auth.setCustomUserClaims(user.uid, { admin: true, sessionVersion: 1 });
const batch = db.batch(),
  createdAt = FieldValue.serverTimestamp();
batch.create(db.doc(`access/${user.uid}`), {
  active: true,
  mustChangePassword: true,
  sessionVersion: 1,
  createdAt,
});
batch.create(db.doc(`members/${user.uid}`), {
  nickname: nick,
  avatar: null,
  createdAt,
});
batch.create(db.doc(`privateMembers/${user.uid}`), {
  username: name,
  realName: real,
  createdAt,
});
await batch.commit();
await auth.updateUser(user.uid, { disabled: false });
console.log(
  "Amministratore creato. Primo accesso con cambio password obbligatorio.",
);
