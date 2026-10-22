import { call } from "./firebase.js";
import {
  el,
  card,
  heading,
  form,
  field,
  button,
  muted,
  nick,
  date,
  toast,
} from "./ui.js";
export function wheel(state) {
  const segments = state.wheel[0]?.segments || [],
    disc = el("div", { class: "wheel-disc" }, el("span", {}, "✦")),
    result = el(
      "p",
      { class: "wheel-result", "aria-live": "polite" },
      "Lasciamo decidere al destino.",
    );
  const colors = [
    "#d3e3b7",
    "#879e82",
    "#e2bb85",
    "#858eac",
    "#d28e7c",
    "#719c98",
  ];
  function draw(items) {
    let cursor = 0;
    const total = items.reduce((s, x) => s + x.weight, 0);
    disc.style.background = `conic-gradient(${items
      .map((s, i) => {
        const start = cursor;
        cursor += (s.weight / total) * 100;
        return `${colors[i % colors.length]} ${start}% ${cursor}%`;
      })
      .join(",")})`;
  }
  if (segments.length) draw(segments);
  let rotation = 0;
  const spin = button("Gira la ruota", async () => {
    const r = await call("spin", { requestId: crypto.randomUUID() });
    draw(r.segments);
    const total = r.segments.reduce((s, x) => s + x.weight, 0),
      before = r.segments.slice(0, r.index).reduce((s, x) => s + x.weight, 0);
    const end = 360 - (360 * (before + r.segments[r.index].weight / 2)) / total;
    rotation = Math.ceil(rotation / 360) * 360 + 1800 + end;
    disc.style.transform = `rotate(${rotation}deg)`;
    await new Promise((resolve) => setTimeout(resolve, 3600));
    result.textContent = r.result;
    toast(r.result);
  });
  spin.disabled = !segments.length;
  return el(
    "div",
    {},
    heading(
      "UN PIZZICO DI CAOS",
      "La ruota ha deciso.",
      "Qualche volta, il piano migliore è non avere un piano.",
    ),
    el(
      "div",
      { class: "grid" },
      card(
        el(
          "div",
          { class: "wheel-wrap" },
          el("span", { class: "pointer", "aria-hidden": "true" }, "▼"),
          disc,
        ),
        result,
        spin,
        ...segments.map((s) => muted(`${s.label} · peso ${s.weight}`)),
      ),
      card(
        el("h3", {}, "Le ultime estrazioni"),
        ...state.wheelSpins.map((s) =>
          el(
            "div",
            { class: "list-row" },
            el("strong", {}, s.result),
            muted(`${nick(state, s.authorUid)} · ${date(s.createdAt)}`),
          ),
        ),
      ),
    ),
    state.admin
      ? card(
          el("h3", {}, "Configura la ruota"),
          form(
            [
              field(
                "Uno spicchio per riga: etichetta | peso",
                "segments",
                "textarea",
                segments.map((s) => `${s.label} | ${s.weight}`).join("\n"),
              ),
            ],
            "Salva configurazione",
            async (d) => {
              await call("saveWheel", {
                segments: d.segments
                  .split("\n")
                  .filter(Boolean)
                  .map((row) => {
                    const parts = row.split("|");
                    return { label: parts[0].trim(), weight: Number(parts[1]) };
                  }),
              });
              toast("Ruota aggiornata.");
            },
          ),
        )
      : null,
  );
}
