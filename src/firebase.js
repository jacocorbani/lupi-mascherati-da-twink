import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
const env = import.meta.env;
export const emulated = env.VITE_USE_EMULATORS === "true";
const projectId = env.VITE_FIREBASE_PROJECT_ID;
export const configured = Boolean(projectId && env.VITE_FIREBASE_API_KEY);
const app = initializeApp({
  projectId: projectId || "demo-combriccola", apiKey: env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, appId: env.VITE_FIREBASE_APP_ID,
});
export const auth = getAuth(app), db = getFirestore(app);
if (emulated) {
  if (!["localhost","127.0.0.1"].includes(location.hostname) || !projectId?.startsWith("demo-"))
    throw new Error("Gli emulatori richiedono un progetto demo locale.");
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
export async function call(name, data) {
  if (!navigator.onLine) throw new Error("Sei offline. Riconnettiti prima di salvare.");
  return (await import("./spark-data.js")).createActions({auth,db})(name, data);
}
export async function upload(file) {
  if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 15000000)
    throw new Error("Scegli una foto JPG, PNG o WebP di massimo 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    let size = Math.min(1200, Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt++, size = Math.floor(size * .75)) {
      const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const result = canvas.toDataURL("image/jpeg", .72);
      if (result.length <= 300000) return result;
    }
    throw new Error("Foto troppo complessa. Prova una versione più piccola.");
  } finally { bitmap.close(); }
}
export const removeUpload = async () => {};
export async function photoBlob(value) {
  if (typeof value !== "string" || value.length > 300000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
    throw new Error("Foto non disponibile.");
  const [header, bytes] = value.split(",");
  return new Blob([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], { type: header.slice(5).split(";")[0] });
}

