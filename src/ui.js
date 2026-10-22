import { photoBlob } from "./firebase.js";
export const $ = (selector) => document.querySelector(selector);
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on"))
      node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "text") node.textContent = value;
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children.flat().filter((v) => v !== null && v !== undefined));
  return node;
}
export const button = (label, fn, kind = "") =>
  el(
    "button",
    {
      type: "button",
      class: `button ${kind}`,
      onClick: async (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        try {
          await fn();
        } catch (error) {
          toast(error.message, true);
        } finally {
          b.disabled = false;
        }
      },
    },
    label,
  );
export const card = (...children) =>
  el("article", { class: "card" }, ...children);
export const muted = (text) => el("p", { class: "muted" }, text);
export const heading = (eyebrow, title, subtitle) =>
  el(
    "header",
    { class: "page-heading" },
    el("span", { class: "eyebrow" }, eyebrow),
    el("h1", {}, title),
    muted(subtitle),
  );
export function toast(message, error = false) {
  const node = $("#toast");
  node.textContent = message;
  node.className = error ? "visible error" : "visible";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (node.className = ""), 6000);
}
export function field(label, name, type = "text", value = "", required = true) {
  const input =
    type === "textarea"
      ? el("textarea", { name, rows: 4, value, required, maxLength: 5000 })
      : el("input", { name, type, value, required });
  return el("label", { class: "field" }, el("span", {}, label), input);
}
export function form(fields, label, submit) {
  const node = el("form", { class: "form" }, ...fields);
  const b = el("button", { class: "button", type: "submit" }, label);
  node.append(b);
  node.addEventListener("submit", async (e) => {
    e.preventDefault();
    b.disabled = true;
    try {
      await submit(Object.fromEntries(new FormData(node)), node);
    } catch (error) {
      toast(error.message, true);
    } finally {
      b.disabled = false;
    }
  });
  return node;
}
export const date = (value) => {
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(+d)
    ? "Data non disponibile"
    : d.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
};
export const millis = (value) =>
  value?.toMillis ? value.toMillis() : Date.parse(value);
export function empty(title, description) {
  return el(
    "div",
    { class: "empty" },
    el("span", { class: "empty-symbol", "aria-hidden": "true" }, "✧"),
    el("h3", {}, title),
    muted(description),
  );
}
export function photo(path, alt = "Foto del diario") {
  const img = el("img", { class: "photo", alt, loading: "lazy" });
  photoBlob(path)
    .then((blob) => {
      if (!img.isConnected) return;
      const url = URL.createObjectURL(blob);
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
    })
    .catch(() => {
      img.replaceWith(muted("Foto non disponibile."));
    });
  return img;
}
export const nick = (state, uid) =>
  state.members.find((m) => m.id === uid)?.nickname || "Membro storico";
export const confirmAction = (message) => window.confirm(message);
