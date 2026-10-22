import { call, upload, removeUpload } from "./firebase.js";
import {
  el,
  card,
  heading,
  form,
  field,
  button,
  muted,
  empty,
  photo,
  nick,
  date,
  toast,
  confirmAction,
} from "./ui.js";
export function diary(state) {
  const editor = form(
    [
      field("Il ricordo di oggi", "text", "textarea", "", false),
      field("Una foto · facoltativa", "image", "file", "", false),
    ],
    "Condividi il ricordo",
    async (d, f) => {
      let path = null;
      try {
        path = d.image?.size ? await upload(d.image) : null;
        await call("saveDiary", { text: d.text, image: path });
        f.reset();
        toast("Un altro ricordo, al sicuro.");
      } catch (e) {
        if (path) await removeUpload(path).catch(() => {});
        throw e;
      }
    },
  );
  editor.querySelector("[type=file]").accept =
    "image/jpeg,image/png,image/webp";
  return el(
    "div",
    {},
    heading(
      "IL NOSTRO ALBUM",
      "Cose da ricordare.",
      "Le grandi serate. I piccoli momenti. Tutto quello che siamo.",
    ),
    card(editor),
    el(
      "div",
      { class: "diary-grid" },
      state.diary.length
        ? state.diary.map((post) =>
            card(
              el(
                "div",
                { class: "byline" },
                el(
                  "span",
                  { class: "avatar" },
                  nick(state, post.authorUid).slice(0, 1),
                ),
                el(
                  "div",
                  {},
                  el("strong", {}, nick(state, post.authorUid)),
                  muted(date(post.createdAt)),
                ),
              ),
              post.image ? photo(post.image) : null,
              el("p", { class: "post-text" }, post.text),
              post.authorUid === state.uid || state.admin
                ? el(
                    "div",
                    { class: "actions" },
                    button(
                      "Modifica",
                      () => {
                        const value = prompt("Modifica il ricordo", post.text);
                        if (value !== null)
                          return call("saveDiary", {
                            id: post.id,
                            text: value,
                          });
                      },
                      "ghost",
                    ),
                    button(
                      "Elimina",
                      async () => {
                        if (confirmAction("Eliminare questo ricordo?"))
                          await call("deleteDiary", { id: post.id });
                      },
                      "ghost danger",
                    ),
                  )
                : null,
            ),
          )
        : empty(
            "La prima pagina è vostra",
            "Condividi una foto o un pensiero per iniziare.",
          ),
    ),
  );
}
