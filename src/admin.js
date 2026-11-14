import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { el, card, heading, muted } from "./ui.js";
export function admin(state) {
  const list=el("div",{},muted("Caricamento membri…"));
  getDocs(collection(db,"privateMembers")).then(async snap => {
    const rows=await Promise.all(snap.docs.map(async record => {
      const p=record.data(), a=(await getDoc(doc(db,"access",record.id))).data();
      return card(el("h3",{},state.members.find(m=>m.id===record.id)?.nickname || p.username),
        muted("@"+p.username+" · "+p.realName),
        muted(a?.active ? "Accesso attivo" : "Accesso disattivato"));
    }));
    if(list.isConnected) list.replaceChildren(...rows);
  }).catch(()=>list.replaceChildren(muted("Impossibile caricare i membri.")));
  return el("div",{},heading("AMMINISTRAZIONE","Le persone del diario.","Gli accessi sono gestiti dal tuo computer."),
    card(el("h3",{},"Gestione account locale"),
      muted("Per creare utenti, reimpostare password e disattivare accessi usa lo strumento di amministrazione locale. Nessuna credenziale amministrativa viene caricata nel sito."),
      muted("Sondaggi, eventi, classifiche e configurazione della ruota restano gestibili dalle rispettive pagine.")),list);
}

