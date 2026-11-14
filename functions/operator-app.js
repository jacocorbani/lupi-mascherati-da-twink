import { createRequire } from "node:module";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
export function operatorApp(projectId = "lupimacheratidatwink") {
 if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  if (!projectId.startsWith("demo-") || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST)
   throw new Error("Gli emulatori devono essere entrambi attivi su un progetto demo.");
  return initializeApp({projectId});
 }
 if (projectId !== "lupimacheratidatwink") throw new Error("Progetto non autorizzato.");
 const root = createRequire(new URL("../package.json",import.meta.url));
 const cli = createRequire(root.resolve("firebase-tools/package.json"));
 const auth = cli("./lib/auth"), account = auth.getGlobalDefaultAccount();
 if (!account) throw new Error("Accedi prima con la CLI Firebase.");
 return initializeApp({projectId,credential:{async getAccessToken(){
  const token=await auth.getAccessToken(account.tokens.refresh_token,[]);
  return {access_token:token.access_token,expires_in:token.expires_in || 3600};
 }}});
}
export async function operatorServices(projectId = "lupimacheratidatwink") {
 const app=operatorApp(projectId);
 if(projectId.startsWith("demo-")) return {app,auth:getAuth(app),db:getFirestore(app)};
 const root=createRequire(new URL("../package.json",import.meta.url));
 const cli=createRequire(root.resolve("firebase-tools/package.json"));
 const local=createRequire(import.meta.url);
 const firestoreRequire=createRequire(local.resolve("firebase-admin/firestore"));
 const {Firestore}=firestoreRequire("@google-cloud/firestore");
 const {OAuth2Client}=cli("google-auth-library");
 const cliAuth=cli("./lib/auth"),account=cliAuth.getGlobalDefaultAccount();
 const authClient=new OAuth2Client();
 const refresh=async()=>{const token=await cliAuth.getAccessToken(account.tokens.refresh_token,[]);return {access_token:token.access_token,expiry_date:Date.now()+3000000};};
 authClient.setCredentials(await refresh());
 authClient.refreshHandler=refresh;
 return {app,auth:getAuth(app),db:new Firestore({projectId,preferRest:true,authClient})};
}

