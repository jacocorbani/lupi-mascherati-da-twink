import { call } from "./firebase.js";
import {
  el,
  card,
  heading,
  form,
  field,
  button,
  muted,
  empty,
  toast,
} from "./ui.js";
export function polls(state) {
  return el(
    "div",
    {},
    heading(
      "DECIDIAMO INSIEME",
      "La parola al gruppo.",
      "Una testa, un voto. Il dibattito, come sempre, è aperto.",
    ),
    state.admin
      ? card(
          el("h3", {}, "Un nuovo sondaggio"),
          form(
            [
              field("La domanda", "question"),
              field("Opzioni · una per riga", "options", "textarea"),
            ],
            "Pubblica sondaggio",
            async (d, f) => {
              await call("savePoll", {
                question: d.question,
                options: d.options.split("\n").filter(Boolean),
              });
              f.reset();
              toast("Sondaggio pubblicato.");
            },
          ),
        )
      : null,
    el(
      "div",
      { class: "grid" },
      state.polls.length
        ? state.polls.map((p) => {
            const total = p.counts.reduce((a, b) => a + b, 0);
            return card(
              el("span", { class: "tag" }, p.closed ? "CONCLUSO" : "SI VOTA"),
              el("h3", {}, p.question),
              ...p.options.map((opt, index) => {
                const pct = total
                  ? Math.round((p.counts[index] / total) * 100)
                  : 0;
                const b = button(
                  `${opt} · ${p.counts[index]} voti (${pct}%)`,
                  async () => {
                    await call("vote", { id: p.id, option: index });
                    toast("Il tuo voto è stato registrato.");
                  },
                  "poll-option",
                );
                b.disabled = p.closed;
                const bar = el("span", { class: "bar", "aria-hidden": "true" });
                bar.style.width = `${pct}%`;
                b.prepend(bar);
                return b;
              }),
              muted(`${total} voti · un voto definitivo per membro`),
              state.admin && !p.closed
                ? button(
                    "Chiudi sondaggio",
                    () => call("savePoll", { id: p.id }),
                    "ghost",
                  )
                : null,
            );
          })
        : empty(
            "Nessuna decisione in sospeso",
            "I prossimi sondaggi compariranno qui.",
          ),
    ),
  );
}
