import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth, configured, call } from "./firebase.js";
import { el, form, field, muted, toast } from "./ui.js";
export async function login(username, password) {
  if (!configured)
    throw new Error(
      "La configurazione del servizio è in attesa di attivazione.",
    );
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username.toLowerCase().trim()))
    throw new Error("Controlla nome utente e password.");
  await setPersistence(auth, browserSessionPersistence);
  try {
    await signInWithEmailAndPassword(
      auth,
      `${username.toLowerCase().trim()}@members.combriccola.invalid`,
      password,
    );
  } catch {
    throw new Error(
      "Accesso non riuscito. Controlla le credenziali o riprova più tardi.",
    );
  }
}
export const logout = () => signOut(auth);
export function loginView() {
  return el(
    "main",
    { class: "login" },
    el(
      "section",
      { class: "login-story" },
      el("div", { class: "brand" }, "◈  LA COMBRICCOLA"),
      el("span", { class: "eyebrow" }, "IL NOSTRO PICCOLO ANGOLO DI MONDO"),
      el("h1", {}, "Le storie migliori", el("em", {}, " si scrivono insieme.")),
      muted(
        "I ricordi, i programmi improbabili e tutte quelle cose che capiamo solo noi.",
      ),
      el(
        "div",
        { class: "orbit-art", "aria-hidden": "true" },
        el("span", {}, "✦"),
        el("i", {}),
        el("b", {}, "C"),
      ),
      el("footer", {}, "UN DIARIO PRIVATO. INFINITE STORIE."),
    ),
    el(
      "section",
      { class: "login-panel" },
      el("span", { class: "eyebrow" }, "BENTORNATO A CASA"),
      el("h2", {}, "Il Diario della Combriccola"),
      muted("Entra con le credenziali ricevute dal tuo amministratore."),
      form(
        [
          field("Nome utente", "username"),
          field("Password", "password", "password"),
        ],
        "Entra nel diario",
        (d) => login(d.username, d.password),
      ),
      muted(
        "Hai dimenticato la password? Chiedi all’amministratore di reimpostarla.",
      ),
      !configured
        ? el(
            "p",
            { class: "notice" },
            "Ambiente non ancora configurato. Nessun collegamento ai dati di produzione.",
          )
        : null,
    ),
  );
}
export function passwordForm(forced = false) {
  return form(
    [
      field("Password attuale", "oldPassword", "password"),
      field("Nuova password · almeno 12 caratteri", "newPassword", "password"),
      field("Ripeti nuova password", "confirm", "password"),
    ],
    forced ? "Imposta la tua password" : "Cambia password",
    async (d) => {
      if (d.confirm !== d.newPassword)
        throw new Error("Le password non coincidono.");
      await call("changePassword", {
        oldPassword: d.oldPassword,
        newPassword: d.newPassword,
      });
      await logout();
      toast("Password aggiornata. Accedi con la nuova password.");
    },
  );
}
