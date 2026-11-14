import { doc, getDoc } from "firebase/firestore";
import { db, call, upload } from "./firebase.js";
import {
  el,
  card,
  heading,
  field,
  form,
  muted,
  date,
  photo,
  toast,
} from "./ui.js";
import { passwordForm } from "./auth.js";
export function profile(state) {
  const own = state.members.find((m) => m.id === state.uid) || {},
    privateBox = card(muted("Caricamento informazioni private…"));
  getDoc(doc(db, "privateMembers", state.uid))
    .then((s) => {
      if (!privateBox.isConnected) return;
      const p = s.data();
      privateBox.replaceChildren(
        el("h3", {}, "Solo per te"),
        muted(`Nome reale: ${p.realName}`),
        muted(`Nome utente: ${p.username}`),
        muted(`Membro dal ${date(p.createdAt)}`),
        muted(
          "Account attivo · queste informazioni sono visibili a te e agli amministratori.",
        ),
      );
    })
    .catch(() =>
      privateBox.replaceChildren(
        muted("Impossibile caricare il profilo privato."),
      ),
    );
  return el(
    "div",
    {},
    heading(
      "IL MIO PROFILO",
      "Sempre tu.",
      "Un soprannome può cambiare. Le storie restano tue.",
    ),
    el(
      "div",
      { class: "grid" },
      card(
        el("h3", {}, "Come ti vede il gruppo"),
        own.avatar ? photo(own.avatar, "Il tuo avatar") : null,
        form(
          [
            field("Soprannome", "nickname", "text", own.nickname || ""),
            field("Avatar · facoltativo", "avatar", "file", "", false),
          ],
          "Salva profilo",
          async (d) => {
            const avatar = d.avatar?.size
              ? await upload(d.avatar)
              : own.avatar || null;
            await call("updateProfile", { nickname: d.nickname, avatar });
            toast("Profilo aggiornato.");
          },
        ),
      ),
      privateBox,
    ),
    card(el("h3", {}, "La tua password"), passwordForm()),
  );
}
