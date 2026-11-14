import {operatorServices} from "../functions/operator-app.js";
import {manageAccount} from "../functions/accounts-local.js";
import {writeFile} from "node:fs/promises";
if(process.env.GCLOUD_PROJECT!=="demo-combriccola") throw Error("Solo demo.");
const op=await operatorServices("demo-combriccola");
let record;
try { record=await manageAccount(op,{action:"create",name:"preview-admin",nickname:"Viaggiatore",admin:true}); }
catch(e){if(e.code!=="auth/email-already-exists")throw e; record=await manageAccount(op,{action:"reset",name:"preview-admin"});}
await op.db.doc("access/"+record.uid).update({mustChangePassword:false});
await writeFile("reports/private/qa-account.local.json",JSON.stringify(record));
console.log("Account QA demo pronto; credenziali salvate solo nel file privato.");

