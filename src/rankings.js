import { call } from "./firebase.js";
import {
  el,
  card,
  heading,
  field,
  form,
  muted,
  empty,
  nick,
  toast,
} from "./ui.js";
export function rankings(state) {
  return el(
    "div",
    {},
    heading(
      "GLORIA IMPERITURA",
      "Il nostro palmarès.",
      "Talenti discutibili. Riconoscimenti assolutamente meritati.",
    ),
    el(
      "div",
      { class: "grid" },
      state.rankings.length
        ? state.rankings.map((r) =>
            card(
              el("h3", {}, r.name),
              muted(r.description),
              ...r.entries
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((entry, i) =>
                  el(
                    "div",
                    { class: "score-row" },
                    el(
                      "span",
                      { class: "position" },
                      String(i + 1).padStart(2, "0"),
                    ),
                    el("strong", {}, nick(state, entry.uid)),
                    el("b", {}, `${entry.score} pt`),
                  ),
                ),
            ),
          )
        : empty(
            "La gloria è ancora da assegnare",
            "Le classifiche del gruppo arriveranno qui.",
          ),
    ),
    state.admin
      ? card(
          el("h3", {}, "Gestisci una classifica"),
          form(
            [
              field(
                "ID classifica · vuoto per crearne una",
                "id",
                "text",
                "",
                false,
              ),
              field("Nome", "name"),
              field("Descrizione", "description", "textarea", "", false),
              ...state.members.map((m) =>
                field(
                  `Punteggio · ${m.nickname}`,
                  `score_${m.id}`,
                  "number",
                  "0",
                ),
              ),
            ],
            "Salva classifica",
            async (d) => {
              await call("saveRanking", {
                id: d.id || undefined,
                name: d.name,
                description: d.description,
                entries: state.members.map((m) => ({
                  uid: m.id,
                  score: Number(d[`score_${m.id}`]),
                })),
              });
              toast("Classifica salvata.");
            },
          ),
          ...state.rankings.map((r) => muted(`${r.name} · ID ${r.id}`)),
        )
      : null,
  );
}
