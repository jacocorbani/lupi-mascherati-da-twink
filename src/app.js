import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { el, $, button, muted, toast, card } from "./ui.js";
import { loginView, logout, passwordForm } from "./auth.js";
import { dashboard } from "./dashboard.js";
import { diary } from "./diary.js";
import { polls } from "./polls.js";
import { events } from "./events.js";
import { wheel } from "./wheel.js";
import { rankings } from "./rankings.js";
import { profile } from "./profile.js";
import { admin } from "./admin.js";
const routes = {
  home: dashboard,
  diario: diary,
  sondaggi: polls,
  eventi: events,
  ruota: wheel,
  classifiche: rankings,
  profilo: profile,
  admin,
};
const labels = {
  home: "Panoramica",
  diario: "Il diario",
  sondaggi: "Sondaggi",
  eventi: "In agenda",
  ruota: "La ruota",
  classifiche: "Classifiche",
  profilo: "Il mio profilo",
  admin: "Amministrazione",
};
const icons = {
  home: "◈",
  diario: "▤",
  sondaggi: "◷",
  eventi: "▦",
  ruota: "✦",
  classifiche: "↗",
  profilo: "○",
  admin: "⚙",
};
let state,
  unsubs = [],
  accessUnsub,
  route = "home",
  generation = 0,
  content,
  nav;
function clear() {
  generation++;
  unsubs.forEach((fn) => fn());
  unsubs = [];
  accessUnsub?.();
  accessUnsub = null;
  state = null;
}
function navigate(next) {
  route = next;
  location.hash = next;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function render() {
  if (!state || !content) return;
  if (!routes[route] || (route === "admin" && !state.admin)) route = "home";
  content.replaceChildren(routes[route](state, navigate));
  const name = { diario: "diary", sondaggi: "polls", ruota: "wheelSpins" }[
    route
  ];
  if (name && state.pageSize && state[name].length >= state.pageSize[name])
    content.append(
      button(
        "Carica contenuti precedenti",
        () => state.loadMore(name),
        "ghost",
      ),
    );
  nav.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.route === route);
    b.setAttribute(
      "aria-current",
      b.dataset.route === route ? "page" : "false",
    );
  });
}
function shell() {
  nav = el(
    "nav",
    { "aria-label": "Navigazione principale" },
    ...Object.keys(routes)
      .filter((k) => k !== "admin" || state.admin)
      .map((k) => {
        const b = button(
          `${icons[k]}  ${labels[k]}`,
          () => navigate(k),
          "nav-link",
        );
        b.dataset.route = k;
        return b;
      }),
  );
  content = el("main", { id: "content", tabIndex: -1 });
  const refresh = button(
    "Nuovi contenuti · aggiorna",
    () => {
      refresh.hidden = true;
      render();
    },
    "refresh",
  );
  refresh.hidden = true;
  $("#app").replaceChildren(
    el(
      "div",
      { class: "layout" },
      el(
        "aside",
        { class: "sidebar" },
        el(
          "a",
          { class: "brand", href: "#home" },
          "◈",
          el(
            "span",
            {},
            "LA COMBRICCOLA",
            el("small", {}, "Il nostro diario, insieme."),
          ),
        ),
        el("span", { class: "nav-caption" }, "IL NOSTRO SPAZIO"),
        nav,
        el(
          "div",
          { class: "sidebar-foot" },
          muted("Solo noi. E le nostre storie."),
          button("Esci dal diario", logout, "ghost"),
        ),
      ),
      el(
        "div",
        { class: "workspace" },
        el(
          "header",
          { class: "topbar" },
          el("span", { class: "topbar-title" }, "Il Diario della Combriccola"),
          el(
            "span",
            { id: "connection", class: "connection" },
            navigator.onLine ? "● Spazio privato" : "○ Sei offline",
          ),
        ),
        refresh,
        content,
        el(
          "footer",
          { class: "footer" },
          "Fatto per stare insieme.  /  COMBRICCOLA 2.0",
        ),
      ),
    ),
  );
  render();
}
async function start(user) {
  clear();
  const current = generation;
  if (!user) {
    $("#app").replaceChildren(loginView());
    return;
  }
  $("#app").replaceChildren(
    el("main", { class: "loading" }, "Benvenuto. Prepariamo il tuo spazio…"),
  );
  try {
    const token = await user.getIdTokenResult();
    if (current !== generation) return;
    accessUnsub = onSnapshot(
      doc(db, "access", user.uid),
      (snap) => {
        const a = snap.data();
        if (!a?.active || a.sessionVersion !== token.claims.sessionVersion) {
          logout();
          return;
        }
        if (a.mustChangePassword) {
          $("#app").replaceChildren(
            el(
              "main",
              { class: "password-gate" },
              card(
                el("span", { class: "eyebrow" }, "IL PRIMO PASSO"),
                el("h1", {}, "Una password tutta tua."),
                muted(
                  "Sostituisci la password temporanea per accedere al diario.",
                ),
                passwordForm(true),
                button("Esci", logout, "ghost"),
              ),
            ),
          );
          return;
        }
        if (state) return;
        const watchers = {};
        state = {
          uid: user.uid,
          admin: token.claims.admin === true,
          members: [],
          diary: [],
          events: [],
          polls: [],
          wheel: [],
          wheelSpins: [],
          rankings: [],
          pageSize: {},
          loadMore: (name) => watch(name, state.pageSize[name] + 100),
        };
        shell();
        function watch(name, size = 100) {
          watchers[name]?.();
          state.pageSize[name] = size;
          let q = collection(db, name);
          if (["diary", "polls", "wheelSpins"].includes(name))
            q = query(q, orderBy("createdAt", "desc"), limit(size));
          const stop = onSnapshot(
            q,
            (s) => {
              if (!state) return;
              state[name] = s.docs.map((d) => ({ id: d.id, ...d.data() }));
              if (
                document.activeElement?.closest("form") ||
                (document.querySelector(".wheel-disc") && route === "ruota")
              ) {
                $(".refresh").hidden = false;
              } else render();
            },
            () =>
              toast(
                "Impossibile aggiornare i contenuti. Controlla la connessione e riprova.",
                true,
              ),
          );
          watchers[name] = stop;
          unsubs.push(stop);
        }
        for (const name of [
          "members",
          "diary",
          "events",
          "polls",
          "wheel",
          "wheelSpins",
          "rankings",
        ])
          watch(name);
      },
      () => {
        logout();
        toast("Accesso non disponibile. Contatta un amministratore.", true);
      },
    );
  } catch {
    await logout();
    toast("Sessione scaduta. Accedi di nuovo.", true);
  }
}
const isPreview =
  import.meta.env.DEV && new URLSearchParams(location.search).has("preview");
if (!isPreview) onAuthStateChanged(auth, start);
window.addEventListener("hashchange", () => {
  route = location.hash.slice(1) || "home";
  render();
});
for (const event of ["online", "offline"])
  window.addEventListener(event, () => {
    const node = $("#connection");
    if (node)
      node.textContent = navigator.onLine
        ? "● Spazio privato"
        : "○ Sei offline";
    if (!navigator.onLine)
      toast("Sei offline. Le modifiche non saranno inviate.", true);
  });
// Only the local Vite development server can load synthetic UI fixtures.
if (isPreview)
  import("./preview.js").then(({ preview }) => {
    clear();
    state = preview;
    route = "home";
    shell();
    $("#connection").textContent = "Anteprima · dati fittizi";
  });
