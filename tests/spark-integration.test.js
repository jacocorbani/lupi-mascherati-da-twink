import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {initializeApp,deleteApp} from "firebase/app";
import {getAuth,connectAuthEmulator,signInWithEmailAndPassword,signOut} from "firebase/auth";
import {getFirestore,connectFirestoreEmulator,doc,getDoc,getDocs,collection} from "firebase/firestore";
import {initializeTestEnvironment} from "@firebase/rules-unit-testing";
import {manageAccount} from "../functions/accounts-local.js";
import {createActions} from "../src/spark-data.js";
const req=createRequire(new URL("../functions/package.json",import.meta.url));
let testEnv,adminApp,operator,client,auth,db,actions,adminUser,member;
before(async()=>{
 if(!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error("Solo emulatori.");
 testEnv=await initializeTestEnvironment({projectId:"demo-combriccola",firestore:{rules:await readFile("firestore.rules","utf8")}});
 await testEnv.clearFirestore();
 adminApp=req("firebase-admin/app").initializeApp({projectId:"demo-combriccola"});
 operator={auth:req("firebase-admin/auth").getAuth(adminApp),db:req("firebase-admin/firestore").getFirestore(adminApp)};
 adminUser=await manageAccount(operator,{action:"create",name:"test-admin",nickname:"Admin fittizio",admin:true});
 member=await manageAccount(operator,{action:"create",name:"test-member",nickname:"Membro fittizio"});
 client=initializeApp({projectId:"demo-combriccola",apiKey:"demo-key"});
 auth=getAuth(client); connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});
 db=getFirestore(client); connectFirestoreEmulator(db,"127.0.0.1",8080);
 actions=createActions({auth,db});
});
after(async()=>{await signOut(auth);await deleteApp(client);await req("firebase-admin/app").deleteApp(adminApp);await testEnv.cleanup();});
const login=record=>signInWithEmailAndPassword(auth,record.username+"@members.combriccola.invalid",record.temporaryPassword);
test("account locale, cambio password personale e invalidazione sessione",async()=>{
 await login(member);
 await assert.rejects(actions("changePassword",{oldPassword:"errata-password",newPassword:"Nuova-password-test-123"}));
 await actions("changePassword",{oldPassword:member.temporaryPassword,newPassword:"Nuova-password-test-123"});
 await signOut(auth);
 await new Promise(r=>setTimeout(r,1200));
 member.temporaryPassword="Nuova-password-test-123"; await login(member);
 assert.equal((await getDoc(doc(db,"access",member.uid))).data().mustChangePassword,false);
});
test("diario, nickname e proprietà; foto inline",async()=>{
 const p=await actions("saveDiary",{text:"Ricordo fittizio",image:"data:image/png;base64,AAAA"});
 await actions("updateProfile",{nickname:"Nuovo nickname",avatar:null});
 await actions("saveDiary",{id:p.id,text:"Modificato"});
 assert.equal((await getDoc(doc(db,"diary",p.id))).data().authorUid,member.uid);
});
test("sondaggi, voto unico, eventi e classifica",async()=>{
 await login(adminUser);
 const p=await actions("savePoll",{question:"Scelta?",options:["A","B"]});
 const e=await actions("saveEvent",{title:"Evento",description:"",location:"Parco",date:new Date(Date.now()+86400000).toISOString()});
 const rank=await actions("saveRanking",{name:"Classifica",description:"",entries:[{uid:member.uid,score:10}]});
 assert.equal((await getDoc(doc(db,"rankings",rank.id,"entries",member.uid))).data().score,10);
 await login(member);
 await actions("vote",{id:p.id,option:0});
 await assert.rejects(actions("vote",{id:p.id,option:1}),/già votato/);
 await actions("attend",{id:e.id,response:"yes",uid:adminUser.uid});
 assert.equal((await getDoc(doc(db,"events",e.id,"attendance",member.uid))).data().response,"yes");
 await assert.rejects(actions("savePoll",{question:"Non admin",options:["A","B"]}));
});
test("ruota browser idempotente e configurazione massima",async()=>{
 await login(adminUser);
 await actions("saveWheel",{segments:Array.from({length:12},(_,i)=>({label:"Spicchio "+i,weight:i+1}))});
 await login(member);
 const first=await actions("spin",{requestId:"same-request"}),second=await actions("spin",{requestId:"same-request"});
 assert.equal(first.result,second.result);
 assert.equal(second.source,"browser");
});
test("reset/disattivazione locale, token obsoleti e ultimo amministratore",async()=>{
 await assert.rejects(manageAccount(operator,{action:"disable",name:"test-admin"}),/ultimo/);
 await login(member);
 await manageAccount(operator,{action:"disable",name:"test-member"});
 await assert.rejects(getDocs(collection(db,"diary")));
 const enabled=await manageAccount(operator,{action:"enable",name:"test-member"});
 await login(enabled);
 assert.equal((await getDoc(doc(db,"access",member.uid))).data().active,true);
});

