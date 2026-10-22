import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, call } from "./firebase.js";
import {
  el,
  card,
  heading,
  field,
  form,
  muted,
  button,
  toast,
  confirmAction,
} from "./ui.js";
export function admin(state) {
  const list = el("div", {}, muted("Caricamento membri…"));
  const statuses = el("div", {});
  Promise.all(
    state.members.map(async (m) => {
      const a = (await getDoc(doc(db, "access", m.id))).data();
      return muted(
        `${m.nickname}: ${a?.active ? "attivo" : "disattivato"}${a?.mustChangePassword ? " · cambio password richiesto" : ""}`,
      );
    }),
  )
    .then((rows) => {
      if (statuses.isConnected) statuses.replaceChildren(...rows);
    })
    .catch(() =>
      statuses.replaceChildren(muted("Stati account non disponibili.")),
    );
  getDocs(collection(db, "privateMembers"))
    .then((snap) => {
      const rows = snap.docs.map((s) => {
        const p = s.data(),
          uid = s.id,
          publicMember = state.members.find((m) => m.id === uid);
        return card(
          el("h3", {}, publicMember?.nickname || p.username),
          muted(`${p.realName} · @${p.username}`),
          uid === state.uid
            ? muted("Il tuo account amministratore")
            : el(
                "div",
                { class: "actions" },
                button(
                  "Disattiva",
                  async () => {
                    if (confirmAction(`Disattivare @${p.username}?`)) {
                      await call("manageMember", { uid, action: "disable" });
                      toast("Account disattivato.");
                    }
                  },
                  "ghost danger",
                ),
                button(
                  "Riattiva",
                  async () => {
                    await call("manageMember", { uid, action: "enable" });
                    toast("Account riattivato: cambio password obbligatorio.");
                  },
                  "ghost",
                ),
                button(
                  "Reimposta password",
                  () => {
                    const f = form(
                      [
                        field(
                          "Password temporanea · almeno 12 caratteri",
                          "password",
                          "password",
                        ),
                      ],
                      "Conferma reset",
                      async (d) => {
                        await call("manageMember", {
                          uid,
                          action: "reset",
                          password: d.password,
                        });
                        f.remove();
                        toast(
                          "Password reimpostata. Comunicala privatamente al membro.",
                        );
                      },
                    );
                    list.prepend(
                      card(el("h3", {}, `Reset di @${p.username}`), f),
                    );
                  },
                  "ghost",
                ),
              ),
          uid !== state.uid
            ? form(
                [field("Nome reale", "realName", "text", p.realName)],
                "Aggiorna nome reale",
                async (d) => {
                  await call("manageMember", {
                    uid,
                    action: "details",
                    realName: d.realName,
                  });
                  toast("Nome aggiornato.");
                },
              )
            : null,
        );
      });
      if (list.isConnected) list.replaceChildren(...rows);
    })
    .catch(() => list.replaceChildren(muted("Impossibile caricare i membri.")));
  return el(
    "div",
    {},
    heading(
      "DIETRO LE QUINTE",
      "La stanza dei bottoni.",
      "Gestisci gli accessi e prenditi cura del gruppo.",
    ),
    card(
      el("h3", {}, "Invita un nuovo membro"),
      form(
        [
          field("Nome utente", "username"),
          field("Soprannome pubblico", "nickname"),
          field("Nome reale · privato", "realName"),
          field(
            "Password temporanea · almeno 12 caratteri",
            "password",
            "password",
          ),
        ],
        "Crea account",
        async (d, f) => {
          await call("createMember", d);
          f.reset();
          toast(
            "Account creato. Comunica le credenziali tramite un canale privato.",
          );
        },
      ),
    ),
    el("h2", {}, "I membri"),
    card(statuses),
    list,
  );
}
