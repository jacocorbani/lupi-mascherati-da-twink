import {
  el,
  card,
  heading,
  muted,
  button,
  nick,
  date,
  millis,
  empty,
} from "./ui.js";
export function dashboard(state, navigate) {
  const upcoming = state.events
      .filter((e) => millis(e.date) > Date.now())
      .sort((a, b) => millis(a.date) - millis(b.date)),
    active = state.polls.filter((p) => !p.closed),
    name = nick(state, state.uid);
  return el(
    "div",
    {},
    heading(
      "IL DIARIO DELLA COMBRICCOLA",
      `Bentornato, ${name}.`,
      "Le nostre persone. Le nostre storie. Un posto per ritrovarci.",
    ),
    el(
      "section",
      { class: "hero" },
      el(
        "div",
        {},
        el("span", { class: "eyebrow" }, "LA BELLEZZA DELLE COSE SEMPLICI"),
        el("h2", {}, "Un altro giorno,", el("em", {}, " un’altra storia.")),
        muted("Non serve un’occasione speciale per creare un bel ricordo."),
        button("Scrivi nel diario  ↗", () => navigate("diario")),
      ),
      el(
        "div",
        { class: "hero-art", "aria-hidden": "true" },
        "✦",
        el("span", {}, "EST. INSIEME"),
      ),
    ),
    el(
      "div",
      { class: "stats" },
      ...[
        [state.members.length, "persone, una combriccola"],
        [state.diary.length, "ricordi condivisi"],
        [upcoming.length, "prossimi appuntamenti"],
        [active.length, "decisioni da prendere"],
      ].map(([n, label]) =>
        el(
          "div",
          {},
          el("strong", {}, String(n).padStart(2, "0")),
          muted(label),
        ),
      ),
    ),
    el(
      "div",
      { class: "grid" },
      card(
        el(
          "div",
          { class: "section-title" },
          el("h3", {}, "In agenda"),
          button("Tutti gli eventi ↗", () => navigate("eventi"), "ghost"),
        ),
        upcoming.length
          ? upcoming
              .slice(0, 3)
              .map((e) =>
                el(
                  "div",
                  { class: "list-row" },
                  el("span", { class: "tag" }, date(e.date)),
                  el("h3", {}, e.title),
                  muted(e.location),
                ),
              )
          : empty("Nessun piano. Per ora.", "Organizziamo qualcosa?"),
      ),
      card(
        el(
          "div",
          { class: "section-title" },
          el("h3", {}, "La voce del gruppo"),
          button("Vai ai sondaggi ↗", () => navigate("sondaggi"), "ghost"),
        ),
        active.length
          ? active
              .slice(0, 3)
              .map((p) =>
                el(
                  "div",
                  { class: "list-row" },
                  el("h3", {}, p.question),
                  muted(`${p.counts.reduce((a, b) => a + b, 0)} voti · aperto`),
                ),
              )
          : empty("Tutto deciso?", "I sondaggi attivi compariranno qui."),
      ),
    ),
    card(
      el(
        "div",
        { class: "section-title" },
        el("h3", {}, "Le ultime pagine"),
        button("Apri il diario ↗", () => navigate("diario"), "ghost"),
      ),
      state.diary.length
        ? state.diary
            .slice(0, 3)
            .map((p) =>
              el(
                "div",
                { class: "list-row" },
                muted(`${nick(state, p.authorUid)} · ${date(p.createdAt)}`),
                el("p", { class: "post-text" }, p.text),
              ),
            )
        : muted("Il prossimo ricordo aspetta solo di essere scritto."),
    ),
    el(
      "div",
      { class: "quick-links" },
      button(
        "✦  Lascia scegliere alla ruota",
        () => navigate("ruota"),
        "ghost",
      ),
      button(
        "↗  Scopri le classifiche",
        () => navigate("classifiche"),
        "ghost",
      ),
    ),
  );
}
