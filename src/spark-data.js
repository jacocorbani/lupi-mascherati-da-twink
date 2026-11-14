import { doc, collection, addDoc, setDoc, updateDoc, deleteDoc, getDocs, writeBatch, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { text, id, options, segments, pick, password } from "../functions/domain.js";
const stamp = () => serverTimestamp();
export function createActions({ auth, db }) { return async function perform(name, d = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Accedi per continuare.");
  const uid = user.uid;
  const ref = (kind, key) => doc(db, kind, id(key));
  switch (name) {
    case "changePassword": {
      password(d.newPassword);
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, d.oldPassword));
      await updatePassword(user, d.newPassword);
      await updateDoc(ref("access",uid), { mustChangePassword: false, validAfter: stamp() });
      return { ok:true };
    }
    case "updateProfile":
      await updateDoc(ref("members",uid), { nickname:text(d.nickname,50), avatar:d.avatar || null }); break;
    case "saveDiary": {
      const body = text(d.text ?? "",5000,0);
      if (d.id) {
        await updateDoc(ref("diary",d.id), { text:body, updatedAt:stamp(), ...(d.image !== undefined ? {image:d.image} : {}) });
        return {id:d.id};
      }
      const saved = await addDoc(collection(db,"diary"), {text:body,image:d.image || null,authorUid:uid,createdAt:stamp(),updatedAt:stamp()});
      return {id:saved.id};
    }
    case "deleteDiary": await deleteDoc(ref("diary",d.id)); break;
    case "savePoll":
      if (d.id) await updateDoc(ref("polls",d.id),{closed:true});
      else { const saved = await addDoc(collection(db,"polls"),{question:text(d.question,200),options:options(d.options),closed:false,createdAt:stamp()}); return {id:saved.id}; }
      break;
    case "vote":
      if (!Number.isInteger(d.option)) throw new Error("Opzione non valida.");
      await runTransaction(db,async tx => {
        const poll = ref("polls",d.id), vote = doc(poll,"votes",uid);
        const [p,v] = await Promise.all([tx.get(poll),tx.get(vote)]);
        if (v.exists()) throw new Error("Hai già votato.");
        if (!p.exists() || p.data().closed) throw new Error("Sondaggio chiuso.");
        tx.set(vote,{option:d.option,createdAt:stamp()});
      }); break;
    case "saveEvent": {
      const data = {title:text(d.title,120),description:text(d.description ?? "",2000,0),location:text(d.location,150),date:Timestamp.fromDate(new Date(d.date)),updatedAt:stamp()};
      if (d.id) await updateDoc(ref("events",d.id),data);
      else {const saved=await addDoc(collection(db,"events"),{...data,createdAt:stamp(),createdBy:uid});return {id:saved.id};}
      break;
    }
    case "attend": await setDoc(doc(ref("events",d.id),"attendance",uid),{response:d.response,updatedAt:stamp()}); break;
    case "saveWheel": await setDoc(ref("wheel","config"),{segments:segments(d.segments),updatedAt:stamp()}); break;
    case "spin": {
      const spinRef = ref("wheelSpins",uid+"_"+id(d.requestId));
      return runTransaction(db,async tx => {
        const [old,c] = await Promise.all([tx.get(spinRef),tx.get(ref("wheel","config"))]);
        if (old.exists()) return old.data();
        if (!c.exists()) throw new Error("Configura prima la ruota.");
        const items=segments(c.data().segments), total=items.reduce((s,x)=>s+x.weight,0);
        // Rejection sampling prevents modulo bias. The browser remains untrusted.
        const ceiling=Math.floor(4294967296/total)*total, random=new Uint32Array(1);
        do {crypto.getRandomValues(random);} while(random[0]>=ceiling);
        const index=pick(items,random[0]%total);
        const result={authorUid:uid,result:items[index].label,index,segments:items,createdAt:stamp(),source:"browser"};
        tx.set(spinRef,result); return result;
      });
    }
    case "saveRanking": {
      if (!Array.isArray(d.entries) || d.entries.length>30 || new Set(d.entries.map(e=>e.uid)).size!==d.entries.length) throw new Error("Massimo 30 membri, senza duplicati.");
      const data={name:text(d.name,100),description:text(d.description ?? "",1000,0),updatedAt:stamp()};
      const target=d.id ? ref("rankings",d.id) : doc(collection(db,"rankings"));
      await setDoc(target,data);
      const old=await getDocs(collection(target,"entries"));
      // Small batches stay below Firestore's per-batch rule document-access limit.
      for (const entry of d.entries) await setDoc(doc(target,"entries",id(entry.uid)),{score:entry.score});
      for (const entry of old.docs) if (!d.entries.some(e=>e.uid===entry.id)) await deleteDoc(entry.ref);
      return {id:target.id};
    }
    default: throw new Error("Gestione account disponibile soltanto dallo strumento locale.");
  }
  return {ok:true};
}; }

