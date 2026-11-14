import {getAuth} from "firebase-admin/auth";
import {getFirestore,Timestamp,FieldValue} from "firebase-admin/firestore";
import {randomBytes} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {operatorServices} from "./operator-app.js";
import {username,emailFor,text} from "./domain.js";
export async function manageAccount({auth,db}, {action,name,nickname,admin=false}) {
 const canonical=username(name), email=emailFor(canonical);
 if (!["create","reset","disable","enable"].includes(action)) throw Error("Azione non valida.");
 const temporaryPassword=randomBytes(24).toString("base64url");
 if(action==="create") {
  const nick=text(nickname || canonical,50);
  const user=await auth.createUser({email,password:temporaryPassword,disabled:true});
  await auth.setCustomUserClaims(user.uid,{admin,sessionVersion:1});
  const batch=db.batch(),createdAt=FieldValue.serverTimestamp();
  batch.create(db.doc("access/"+user.uid),{active:true,mustChangePassword:true,sessionVersion:1,validAfter:Timestamp.fromMillis(0),createdAt});
  batch.create(db.doc("members/"+user.uid),{nickname:nick,avatar:null,createdAt});
  batch.create(db.doc("privateMembers/"+user.uid),{username:canonical,realName:nick,createdAt});
  await batch.commit(); await auth.updateUser(user.uid,{disabled:false});
  return {username:canonical,uid:user.uid,temporaryPassword};
 }
 const user=await auth.getUserByEmail(email), ref=db.doc("access/"+user.uid), old=(await ref.get()).data();
 if(!old) throw Error("Account non iscritto: revisione operatore richiesta.");
 if(action==="disable" && user.customClaims?.admin) {
  const active=await db.collection("access").where("active","==",true).get();
  let otherAdmins=0;
  for(const d of active.docs) if(d.id!==user.uid && (await auth.getUser(d.id)).customClaims?.admin) otherAdmins++;
  if(!otherAdmins) throw Error("Non puoi disattivare l'ultimo amministratore.");
 }
 const version=old.sessionVersion+1;
 await ref.update({active:false,sessionVersion:version});
 await auth.revokeRefreshTokens(user.uid);
 await auth.setCustomUserClaims(user.uid,{...user.customClaims,sessionVersion:version});
 await auth.updateUser(user.uid,{disabled:action==="disable",...(action!=="disable" ? {password:temporaryPassword}: {})});
 if(action!=="disable") await ref.update({active:true,mustChangePassword:true,validAfter:Timestamp.fromMillis(0)});
 return {username:canonical,uid:user.uid,...(action!=="disable" ? {temporaryPassword}: {})};
}
if (process.argv[1]?.replace(/\\/g,"/").endsWith("/accounts-local.js")) {
 const [action,name,nickname,...flags]=process.argv.slice(2);
 if(!action || !name) throw Error("Uso: node functions/accounts-local.js create|reset|disable|enable USERNAME NICKNAME [--admin] --apply");
 if(!flags.includes("--apply") && nickname!=="--apply") {
  console.log("Anteprima: aggiungere --apply per eseguire. Password temporanee generate localmente."); process.exit(0);
 }
 const projectId=process.env.GCLOUD_PROJECT || "lupimacheratidatwink";
 const {auth,db}=await operatorServices(projectId);
 const result=await manageAccount({auth,db},{action,name,nickname:nickname?.startsWith("--") ? name : nickname,admin:flags.includes("--admin")});
 await mkdir("reports/private",{recursive:true});
 const file="reports/private/credenziali-"+result.username+"-"+Date.now()+".local.json";
 if(result.temporaryPassword) await writeFile(file,JSON.stringify(result,null,2),{flag:"wx",mode:0o600});
 console.log(JSON.stringify({username:result.username,action,credentialsFile:result.temporaryPassword ? file : null}));
}

