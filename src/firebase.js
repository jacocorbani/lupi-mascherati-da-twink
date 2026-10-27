import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getBlob,
  deleteObject,
} from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
const env = import.meta.env;
export const emulated = env.VITE_USE_EMULATORS === "true";
const projectId = env.VITE_FIREBASE_PROJECT_ID;
export const configured = Boolean(projectId && env.VITE_FIREBASE_API_KEY);
const app = initializeApp({
  projectId: projectId || "demo-combriccola",
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: env.VITE_FIREBASE_APP_ID,
});
export const auth = getAuth(app),
  db = getFirestore(app),
  functions = getFunctions(app, "europe-west1"),
  storage = getStorage(app);
if (emulated) {
  if (
    !["localhost", "127.0.0.1"].includes(location.hostname) ||
    !projectId?.startsWith("demo-")
  )
    throw new Error("Gli emulatori richiedono un progetto demo locale.");
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
} else if (env.VITE_APPCHECK_SITE_KEY)
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(env.VITE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
export async function call(name, data) {
  if (!navigator.onLine)
    throw new Error("Sei offline. Riconnettiti prima di salvare.");
  return (await httpsCallable(functions, name)(data)).data;
}
export async function upload(file) {
  if (!file) return null;
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5242880
  )
    throw new Error("Scegli una foto JPG, PNG o WebP di massimo 5 MB.");
  const path = `media/${auth.currentUser.uid}/${crypto.randomUUID()}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}
export const removeUpload = (path) => deleteObject(ref(storage, path));
export const photoBlob = (path) => getBlob(ref(storage, path), 5242880);
