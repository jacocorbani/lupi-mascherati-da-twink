import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { randomInt, randomUUID } from "node:crypto";
import {
  ValidationError,
  text,
  username,
  emailFor,
  password,
  id,
  options,
  segments,
  pick,
  timestamp,
} from "./domain.js";

initializeApp();
const db = getFirestore(),
  auth = getAuth();
const apiKey = defineString("AUTH_WEB_API_KEY", { default: "demo-key" });
const local = process.env.FUNCTIONS_EMULATOR === "true";
const now = () => FieldValue.serverTimestamp();
const fail = (message = "Operazione non consentita.") => {
  throw new HttpsError("permission-denied", message);
};
async function guard(req, admin = false, allowTemporary = false) {
  if (!req.auth)
    throw new HttpsError("unauthenticated", "Accedi per continuare.");
  const a = (await db.doc(`access/${req.auth.uid}`).get()).data();
  if (
    !a?.active ||
    req.auth.token.sessionVersion !== a.sessionVersion ||
    (!allowTemporary && a.mustChangePassword)
  )
    fail();
  if (admin && req.auth.token.admin !== true) fail();
  return a;
}
async function limit(uid, action, seconds = 1) {
  const ref = db.doc(`limits/${uid}_${action}`);
  await db.runTransaction(async (tx) => {
    const old = await tx.get(ref),
      time = Date.now();
    if (old.exists && time - old.data().time < seconds * 1000)
      throw new HttpsError(
        "resource-exhausted",
        "Attendi qualche secondo e riprova.",
      );
    tx.set(ref, { time });
  });
}
function callable(
  handler,
  { admin = false, temporary = false, seconds = 1 } = {},
) {
  return onCall(
    {
      region: "europe-west1",
      enforceAppCheck: !local,
      maxInstances: 5,
      timeoutSeconds: 60,
    },
    async (req) => {
      try {
        const account = await guard(req, admin, temporary);
        await limit(req.auth.uid, handler.name, seconds);
        return await handler(
          req.data ?? {},
          req.auth.uid,
          account,
          req.auth.token,
        );
      } catch (e) {
        if (e instanceof HttpsError) throw e;
        if (e instanceof ValidationError)
          throw new HttpsError("invalid-argument", e.message);
        throw new HttpsError(
          "internal",
          "Operazione non riuscita. Riprova o contatta un amministratore.",
        );
      }
    },
  );
}
async function mediaPath(value, uid) {
  if (value == null || value === "") return null;
  if (
    typeof value !== "string" ||
    !new RegExp(`^media/${uid}/[a-zA-Z0-9_-]+$`).test(value)
  )
    throw new ValidationError("Fotografia non valida.");
  const [meta] = await getStorage().bucket().file(value).getMetadata();
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(meta.contentType) ||
    Number(meta.size) > 5242880
  )
    throw new ValidationError("Formato immagine non valido.");
  return value;
}
export const createMember = callable(
  async function createMember(d, actor) {
    const name = username(d.username),
      nick = text(d.nickname, 50),
      real = text(d.realName, 100),
      pw = password(d.password);
    let user;
    try {
      user = await auth.createUser({
        email: emailFor(name),
        password: pw,
        disabled: true,
      });
      await auth.setCustomUserClaims(user.uid, {
        admin: false,
        sessionVersion: 1,
      });
      const batch = db.batch();
      batch.create(db.doc(`members/${user.uid}`), {
        nickname: nick,
        avatar: null,
        createdAt: now(),
      });
      batch.create(db.doc(`privateMembers/${user.uid}`), {
        username: name,
        realName: real,
        createdAt: now(),
      });
      batch.create(db.doc(`access/${user.uid}`), {
        active: true,
        mustChangePassword: true,
        sessionVersion: 1,
        createdAt: now(),
      });
      batch.create(db.collection("audit").doc(), {
        action: "createMember",
        actor,
        target: user.uid,
        createdAt: now(),
      });
      await batch.commit();
      await auth.updateUser(user.uid, { disabled: false });
      return { uid: user.uid };
    } catch (e) {
      // Failed provisioning remains disabled and inaccessible; an operator can repair it.
      if (e.code === "auth/email-already-exists")
        throw new HttpsError("already-exists", "Username già utilizzato.");
      throw e;
    }
  },
  { admin: true },
);
export const manageMember = callable(
  async function manageMember(d, actor) {
    const uid = id(d.uid);
    if (uid === actor)
      throw new ValidationError(
        "Non puoi modificare il tuo accesso da questo pannello.",
      );
    const ref = db.doc(`access/${uid}`),
      record = (await ref.get()).data();
    if (!record) throw new ValidationError("Membro non trovato.");
    if (d.action === "details") {
      await db
        .doc(`privateMembers/${uid}`)
        .update({ realName: text(d.realName, 100) });
    } else if (
      d.action === "disable" ||
      d.action === "reset" ||
      d.action === "enable"
    ) {
      const user = await auth.getUser(uid),
        next = record.sessionVersion + 1;
      if (d.action === "reset") password(d.password);
      // Fail closed before changing Auth, invalidating cached tokens immediately.
      await ref.update({
        active: false,
        sessionVersion: next,
        mustChangePassword: true,
      });
      await auth.updateUser(uid, {
        disabled: true,
        ...(d.action === "reset" ? { password: d.password } : {}),
      });
      await auth.revokeRefreshTokens(uid);
      await auth.setCustomUserClaims(uid, {
        ...user.customClaims,
        sessionVersion: next,
      });
      if (d.action !== "disable") {
        await auth.updateUser(uid, { disabled: false });
        await ref.update({ active: true });
      }
    } else throw new ValidationError("Azione non valida.");
    await db
      .collection("audit")
      .add({ action: d.action, actor, target: uid, createdAt: now() });
    return { ok: true };
  },
  { admin: true },
);
export const changePassword = callable(
  async function changePassword(d, uid, a) {
    const next = password(d.newPassword);
    if (
      typeof d.oldPassword !== "string" ||
      d.oldPassword.length > 128 ||
      d.oldPassword === next
    )
      throw new ValidationError(
        "Scegli una password diversa da quella attuale.",
      );
    const user = await auth.getUser(uid);
    const base = local
      ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`
      : "https://identitytoolkit.googleapis.com/v1";
    const verified = await fetch(
      `${base}/accounts:signInWithPassword?key=${apiKey.value()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: d.oldPassword,
          returnSecureToken: true,
        }),
      },
    );
    if (!verified.ok)
      throw new HttpsError("unauthenticated", "Password attuale non corretta.");
    const version = a.sessionVersion + 1;
    await db
      .doc(`access/${uid}`)
      .update({ sessionVersion: version, mustChangePassword: true });
    await auth.updateUser(uid, { password: next });
    await auth.revokeRefreshTokens(uid);
    await auth.setCustomUserClaims(uid, {
      ...user.customClaims,
      sessionVersion: version,
    });
    await db.doc(`access/${uid}`).update({ mustChangePassword: false });
    return { ok: true };
  },
  { temporary: true, seconds: 5 },
);
export const updateProfile = callable(async function updateProfile(d, uid) {
  await db
    .doc(`members/${uid}`)
    .update({
      nickname: text(d.nickname, 50),
      avatar: await mediaPath(d.avatar, uid),
    });
  return { ok: true };
});
export const saveDiary = callable(async function saveDiary(d, uid, a, claims) {
  const ref = d.id ? db.doc(`diary/${id(d.id)}`) : db.collection("diary").doc();
  const body = text(d.text ?? "", 5000, 0),
    image = await mediaPath(d.image, uid);
  if (!body && !image)
    throw new ValidationError("Scrivi un ricordo o aggiungi una foto.");
  await db.runTransaction(async (tx) => {
    const old = await tx.get(ref);
    if (
      d.id &&
      (!old.exists || (old.data().authorUid !== uid && claims.admin !== true))
    )
      fail();
    if (old.exists)
      tx.update(ref, {
        text: body,
        ...(d.image !== undefined ? { image } : {}),
        updatedAt: now(),
      });
    else
      tx.create(ref, {
        text: body,
        image,
        authorUid: uid,
        createdAt: now(),
        updatedAt: now(),
      });
  });
  return { id: ref.id };
});
export const deleteDiary = callable(
  async function deleteDiary(d, uid, a, claims) {
    const ref = db.doc(`diary/${id(d.id)}`);
    await db.runTransaction(async (tx) => {
      const post = await tx.get(ref);
      if (
        !post.exists ||
        (post.data().authorUid !== uid && claims.admin !== true)
      )
        fail();
      tx.delete(ref);
    });
    return { ok: true };
  },
);
export const savePoll = callable(
  async function savePoll(d) {
    if (d.id) {
      await db.doc(`polls/${id(d.id)}`).update({ closed: true });
      return { ok: true };
    }
    const opts = options(d.options);
    const ref = await db
      .collection("polls")
      .add({
        question: text(d.question, 200),
        options: opts,
        counts: opts.map(() => 0),
        closed: false,
        createdAt: now(),
      });
    return { id: ref.id };
  },
  { admin: true },
);
export const vote = callable(async function vote(d, uid) {
  const ref = db.doc(`polls/${id(d.id)}`),
    voteRef = ref.collection("votes").doc(uid);
  await db.runTransaction(async (tx) => {
    const [poll, existing] = await Promise.all([tx.get(ref), tx.get(voteRef)]);
    if (!poll.exists || poll.data().closed)
      throw new ValidationError("Sondaggio chiuso.");
    if (existing.exists)
      throw new HttpsError("already-exists", "Hai già votato.");
    const p = poll.data();
    if (
      !Number.isInteger(d.option) ||
      d.option < 0 ||
      d.option >= p.options.length
    )
      throw new ValidationError("Opzione non valida.");
    const counts = [...p.counts];
    counts[d.option]++;
    tx.create(voteRef, { option: d.option, createdAt: now() });
    tx.update(ref, { counts });
  });
  return { ok: true };
});
export const saveEvent = callable(
  async function saveEvent(d, uid) {
    const data = {
      title: text(d.title, 120),
      description: text(d.description ?? "", 2000, 0),
      location: text(d.location, 150),
      date: Timestamp.fromMillis(timestamp(d.date)),
      updatedAt: now(),
    };
    const ref = d.id
      ? db.doc(`events/${id(d.id)}`)
      : db.collection("events").doc();
    if (d.id) await ref.update(data);
    else await ref.create({ ...data, createdBy: uid, createdAt: now() });
    return { id: ref.id };
  },
  { admin: true },
);
export const attend = callable(async function attend(d, uid) {
  if (!["yes", "no", "maybe"].includes(d.response))
    throw new ValidationError("Risposta non valida.");
  const ref = db.doc(`events/${id(d.id)}`);
  await db.runTransaction(async (tx) => {
    const event = await tx.get(ref);
    if (!event.exists || event.data().date.toMillis() < Date.now())
      throw new ValidationError("Evento già concluso.");
    tx.set(ref.collection("attendance").doc(uid), {
      response: d.response,
      updatedAt: now(),
    });
  });
  return { ok: true };
});
export const saveWheel = callable(
  async function saveWheel(d) {
    await db
      .doc("wheel/config")
      .set({ segments: segments(d.segments), updatedAt: now() });
    return { ok: true };
  },
  { admin: true },
);
export const spin = callable(
  async function spin(d, uid) {
    const spinId = id(d.requestId),
      ref = db.doc(`wheelSpins/${uid}_${spinId}`);
    return db.runTransaction(async (tx) => {
      const [existing, config] = await Promise.all([
        tx.get(ref),
        tx.get(db.doc("wheel/config")),
      ]);
      if (existing.exists) return existing.data();
      if (!config.exists)
        throw new ValidationError("La ruota non è ancora configurata.");
      const items = segments(config.data().segments),
        index = pick(
          items,
          randomInt(items.reduce((sum, s) => sum + s.weight, 0)),
        );
      const result = {
        authorUid: uid,
        result: items[index].label,
        index,
        segments: items,
        createdAt: now(),
      };
      tx.create(ref, result);
      return { result: result.result, index, segments: items };
    });
  },
  { seconds: 5 },
);
export const saveRanking = callable(
  async function saveRanking(d) {
    if (!Array.isArray(d.entries) || d.entries.length > 100)
      throw new ValidationError("Classifica non valida.");
    const entries = d.entries.map((e) => {
      if (!Number.isSafeInteger(e.score) || Math.abs(e.score) > 1000000)
        throw new ValidationError("Punteggio non valido.");
      return { uid: id(e.uid), score: e.score };
    });
    if (new Set(entries.map((e) => e.uid)).size !== entries.length)
      throw new ValidationError("Membro duplicato.");
    for (const entry of entries)
      if (!(await db.doc(`members/${entry.uid}`).get()).exists)
        throw new ValidationError("Membro non trovato.");
    const ref = d.id
      ? db.doc(`rankings/${id(d.id)}`)
      : db.collection("rankings").doc();
    await ref.set({
      name: text(d.name, 100),
      description: text(d.description ?? "", 1000, 0),
      entries,
      updatedAt: now(),
    });
    return { id: ref.id };
  },
  { admin: true },
);
