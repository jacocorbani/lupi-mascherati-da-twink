// Only public Web SDK settings; never consumes local credentials or backups.
const fs=require("node:fs");
const config=JSON.parse(fs.readFileSync("firebase.web.json","utf8"));
if(config.projectId!=="lupimacheratidatwink" || !config.apiKey || !config.appId) throw Error("Configurazione pubblica incompleta.");
const vars={VITE_USE_EMULATORS:"false",VITE_FIREBASE_PROJECT_ID:config.projectId,VITE_FIREBASE_API_KEY:config.apiKey,VITE_FIREBASE_AUTH_DOMAIN:config.authDomain,VITE_FIREBASE_APP_ID:config.appId};
fs.writeFileSync(".env.production",Object.entries(vars).map(([k,v])=>k+"="+v).join("\n")+"\n");

