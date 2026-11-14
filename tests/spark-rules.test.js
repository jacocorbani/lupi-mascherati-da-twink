import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,serverTimestamp,Timestamp,query,orderBy,limit} from "firebase/firestore";
let env;
const zero=Timestamp.fromMillis(0), time=()=>serverTimestamp();
const uid=(name,claims={})=>env.authenticatedContext(name,{sessionVersion:1,admin:false,auth_time:Math.floor(Date.now()/1000),...claims}).firestore();
before(async()=>{
 env=await initializeTestEnvironment({projectId:"demo-combriccola",firestore:{rules:await readFile("firestore.rules","utf8")}});
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
  for(const name of ["alice","bob","admin","disabled"]) {
   await setDoc(doc(c.firestore(),"access",name),{active:name!=="disabled",sessionVersion:1,mustChangePassword:false,validAfter:zero,createdAt:zero});
   await setDoc(doc(c.firestore(),"members",name),{nickname:name,avatar:null,createdAt:zero});
   await setDoc(doc(c.firestore(),"privateMembers",name),{username:name,realName:"Persona fittizia",createdAt:zero});
  }
 });
});
after(()=>env?.cleanup());
const post=()=>({text:"Ricordo",image:null,authorUid:"alice",createdAt:time(),updatedAt:time()});
test("anonimi, non iscritti, disabilitati e sessioni obsolete esclusi",async()=>{
 for(const db of [env.unauthenticatedContext().firestore(),uid("stranger"),uid("disabled"),uid("alice",{sessionVersion:0})])
  await assertFails(getDocs(collection(db,"diary")));
});
test("profilo pubblico e dati privati separati",async()=>{
 await assertSucceeds(getDocs(collection(uid("bob"),"members")));
 await assertSucceeds(getDoc(doc(uid("alice"),"privateMembers","alice")));
 await assertFails(getDoc(doc(uid("bob"),"privateMembers","alice")));
 await assertFails(getDocs(collection(uid("bob"),"privateMembers")));
 await assertSucceeds(getDocs(collection(uid("admin",{admin:true}),"privateMembers")));
});
test("ruoli, creazione account e versione sessione non modificabili dal browser",async()=>{
 const db=uid("alice");
 await assertFails(setDoc(doc(db,"access","stranger"),{active:true}));
 await assertFails(updateDoc(doc(db,"access","alice"),{sessionVersion:2}));
 await assertFails(updateDoc(doc(db,"members","alice"),{admin:true}));
 await assertFails(setDoc(doc(db,"privateMembers","alice"),{username:"admin"}));
});
test("profilo: validazione anche in update",async()=>{
 const ref=doc(uid("alice"),"members","alice");
 await assertSucceeds(updateDoc(ref,{nickname:"Nuovo nome"}));
 await assertFails(updateDoc(ref,{nickname:""}));
 await assertFails(updateDoc(ref,{avatar:"https://example.com/pixel"}));
 await assertFails(updateDoc(doc(uid("bob"),"members","alice"),{nickname:"Rubato"}));
});
test("diario: proprietario e campi immutabili",async()=>{
 const db=uid("alice"), ref=doc(db,"diary","own");
 await assertSucceeds(setDoc(ref,post()));
 await assertSucceeds(updateDoc(ref,{text:"Modificato",updatedAt:time()}));
 await assertFails(updateDoc(ref,{authorUid:"bob",updatedAt:time()}));
 await assertFails(updateDoc(ref,{createdAt:zero,updatedAt:time()}));
 await assertFails(updateDoc(doc(uid("bob"),"diary","own"),{text:"Altrui",updatedAt:time()}));
 await assertFails(deleteDoc(doc(uid("bob"),"diary","own")));
 await assertSucceeds(getDocs(query(collection(db,"diary"),orderBy("createdAt","desc"),limit(20))));
});
test("diario: schema, testo, immagine e timestamp",async()=>{
 const db=uid("alice");
 for(const [i,p] of [{...post(),authorUid:"bob"},{...post(),text:"x".repeat(5001)},{...post(),image:"data:image/svg+xml;base64,AAAA"},{...post(),image:"data:image/png;base64,"+"A".repeat(300001)},{...post(),extra:true},{...post(),createdAt:zero},{...post(),text:""}].entries())
  await assertFails(setDoc(doc(db,"diary","invalid"+i),p));
 await assertSucceeds(setDoc(doc(db,"diary","image"),{...post(),text:"",image:"data:image/png;base64,AAAA"}));
 await assertFails(updateDoc(doc(db,"diary","image"),{image:42,updatedAt:time()}));
});
test("sondaggi: admin, opzioni tipizzate e nessun contatore falsificabile",async()=>{
 const data={question:"Dove?",options:["Qui","Là"],closed:false,createdAt:time()};
 await assertFails(setDoc(doc(uid("alice"),"polls","poll"),data));
 const ref=doc(uid("admin",{admin:true}),"polls","poll");
 await assertSucceeds(setDoc(ref,data));
 await assertFails(updateDoc(ref,{counts:[999,0]}));
 await assertFails(updateDoc(ref,{options:["Cambio","Opzione"]}));
 await assertFails(setDoc(doc(uid("admin",{admin:true}),"polls","invalid"),{...data,options:["A",42]}));
});
test("voti: solo il proprio, una volta, indice valido e chiusura rispettata",async()=>{
 const db=uid("alice");
 await assertFails(setDoc(doc(db,"polls","poll","votes","bob"),{option:0,createdAt:time()}));
 await assertFails(setDoc(doc(db,"polls","poll","votes","alice"),{option:2,createdAt:time()}));
 await assertSucceeds(setDoc(doc(db,"polls","poll","votes","alice"),{option:0,createdAt:time()}));
 await assertFails(updateDoc(doc(db,"polls","poll","votes","alice"),{option:1}));
 await assertFails(deleteDoc(doc(db,"polls","poll","votes","alice")));
 await assertSucceeds(updateDoc(doc(uid("admin",{admin:true}),"polls","poll"),{closed:true}));
 await assertFails(setDoc(doc(uid("bob"),"polls","poll","votes","bob"),{option:0,createdAt:time()}));
 await assertFails(setDoc(doc(db,"polls","missing","votes","alice"),{option:0,createdAt:time()}));
});
test("eventi e partecipazioni: admin, futuro e UID",async()=>{
 const data={title:"Incontro",description:"",location:"Parco",date:Timestamp.fromMillis(Date.now()+86400000),createdBy:"admin",createdAt:time(),updatedAt:time()};
 await assertSucceeds(setDoc(doc(uid("admin",{admin:true}),"events","event"),data));
 await assertFails(setDoc(doc(uid("alice"),"events","event2"),{...data,createdBy:"alice"}));
 const r=doc(uid("alice"),"events","event","attendance","alice");
 await assertSucceeds(setDoc(r,{response:"yes",updatedAt:time()}));
 await assertSucceeds(updateDoc(r,{response:"maybe",updatedAt:time()}));
 await assertFails(updateDoc(r,{response:"wrong",updatedAt:time()}));
 await assertFails(setDoc(doc(uid("alice"),"events","event","attendance","bob"),{response:"yes",updatedAt:time()}));
 await assertSucceeds(updateDoc(doc(uid("admin",{admin:true}),"events","event"),{date:zero,updatedAt:time()}));
 await assertFails(updateDoc(r,{response:"no",updatedAt:time()}));
});
test("ruota: config admin, spicchi validi, provenienza browser e immutabilità",async()=>{
 const segments=[{label:"A",weight:1},{label:"B",weight:2}];
 const c=doc(uid("admin",{admin:true}),"wheel","config");
 await assertSucceeds(setDoc(c,{segments,updatedAt:time()}));
 await assertFails(updateDoc(c,{segments:[{label:"A",weight:-1},{label:"B",weight:2}],updatedAt:time()}));
 await assertFails(setDoc(doc(uid("alice"),"wheel","config"),{segments,updatedAt:time()}));
 const r=doc(uid("alice"),"wheelSpins","spin");
 const spin={authorUid:"alice",result:"A",index:0,segments,source:"browser",createdAt:time()};
 await assertFails(setDoc(r,{...spin,source:"server"}));
 await assertFails(setDoc(r,{...spin,result:"Inventato"}));
 await assertSucceeds(setDoc(r,spin));
 await assertFails(updateDoc(r,{result:"B",index:1}));
});
test("classifiche: admin e punteggi separati validati",async()=>{
 const db=uid("admin",{admin:true}), ref=doc(db,"rankings","rank");
 const data={name:"Classifica",description:"",updatedAt:time()};
 await assertSucceeds(setDoc(ref,data));
 await assertFails(setDoc(doc(uid("alice"),"rankings","other"),data));
 await assertSucceeds(setDoc(doc(db,"rankings","rank","entries","alice"),{score:42}));
 await assertFails(setDoc(doc(db,"rankings","rank","entries","alice"),{score:"42"}));
 await assertFails(setDoc(doc(db,"rankings","rank","entries","missing"),{score:1}));
 await assertFails(setDoc(doc(uid("alice"),"rankings","rank","entries","alice"),{score:999}));
});
test("archivio e percorsi legacy non scrivibili",async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),"historical","old"),{legacy:{text:"Fittizio"}}));
 await assertFails(getDoc(doc(uid("alice"),"historical","old")));
 await assertSucceeds(getDoc(doc(uid("admin",{admin:true}),"historical","old")));
 await assertFails(setDoc(doc(uid("admin",{admin:true}),"historical","new"),{}));
 await assertFails(setDoc(doc(uid("alice"),"groups","combriccola-principale"),{}));
});
test("cambio password: solo reminder e revoca verso il futuro, mai autorizzazioni",async()=>{
 const db=uid("bob");
 await assertFails(updateDoc(doc(db,"access","bob"),{mustChangePassword:false,validAfter:zero}));
 await assertSucceeds(updateDoc(doc(db,"access","bob"),{mustChangePassword:false,validAfter:time()}));
 await assertFails(getDocs(collection(db,"diary")));
});

