import { call, db } from "./firebase.js";
import { collection, getDocs } from "firebase/firestore";
import {
  el,
  card,
  heading,
  form,
  field,
  button,
  muted,
  empty,
  nick,
  date,
  millis,
  toast,
} from "./ui.js";
export function events(state) {
  function editor(event) {
    const dt = event
      ? new Date(
          millis(event.date) -
            new Date(millis(event.date)).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "";
    return form(
      [
        field("Titolo", "title", "text", event?.title || ""),
        field(
          "Descrizione",
          "description",
          "textarea",
          event?.description || "",
          false,
        ),
        field("Quando", "date", "datetime-local", dt),
        field("Dove", "location", "text", event?.location || ""),
      ],
      event ? "Salva modifiche" : "Crea evento",
      async (d, f) => {
        await call("saveEvent", {
          ...d,
          id: event?.id,
          date: new Date(d.date).toISOString(),
        });
        if (!event) f.reset();
        toast("Evento salvato.");
      },
    );
  }
  return el(
    "div",
    {},
    heading(
      "PROSSIMA FERMATA",
      "Ci vediamo qui.",
      "Fai spazio alle persone giuste, sul calendario e nella vita.",
    ),
    state.admin ? card(editor()) : null,
    el(
      "div",
      { class: "grid" },
      state.events.length
        ? [...state.events]
            .sort((a, b) => millis(a.date) - millis(b.date))
            .map((e) => {
              const past = millis(e.date) < Date.now(),
                list = el("div", {});
              return card(
                el("span", { class: "tag" }, past ? "RICORDO" : "IN PROGRAMMA"),
                el("h3", {}, e.title),
                el("p", {}, date(e.date)),
                muted(e.location),
                el("p", {}, e.description),
                !past
                  ? el(
                      "div",
                      { class: "actions" },
                      ...["yes", "maybe", "no"].map((response, i) =>
                        button(
                          ["Ci sono", "Forse", "Non ci sono"][i],
                          async () => {
                            await call("attend", { id: e.id, response });
                            toast("Partecipazione aggiornata.");
                          },
                          i ? "ghost" : "",
                        ),
                      ),
                    )
                  : null,
                button(
                  "Vedi partecipanti",
                  async () => {
                    const snap = await getDocs(
                      collection(db, "events", e.id, "attendance"),
                    );
                    list.replaceChildren(
                      ...snap.docs.map((d) =>
                        muted(
                          `${nick(state, d.id)} · ${{ yes: "Ci sono", no: "Non ci sono", maybe: "Forse" }[d.data().response]}`,
                        ),
                      ),
                    );
                    if (snap.empty)
                      list.append(muted("Ancora nessuna risposta."));
                  },
                  "ghost",
                ),
                list,
                state.admin
                  ? button(
                      "Modifica evento",
                      () => list.replaceChildren(editor(e)),
                      "ghost",
                    )
                  : null,
              );
            })
        : empty(
            "Il calendario aspetta voi",
            "Il prossimo incontro potrebbe essere il migliore.",
          ),
    ),
  );
}
