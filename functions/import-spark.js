import {getFirestore} from "firebase-admin/firestore";
import {readFile,mkdir,open} from "node:fs/promises";
import {operatorServices} from "./operator-app.js";
import {prepareSparkPlan} from "../scripts/spark-plan.js";
import {hash,importPlan} from "./migration-engine.js";
const [file,expectedHash,mode]=process.argv.slice(2);
if(!file || !/^[a-f0-9]{64}$/.test(expectedHash||"")) throw Error("Uso: node functions/import-spark.js BACKUP SHA256 [--apply]");
const bytes=await readFile(file);
if(hash(bytes)!==expectedHash) throw Error("Hash backup errato.");
const backup=JSON.parse(bytes),projectId=process.env.GCLOUD_PROJECT || "lupimacheratidatwink";
if(backup.projectId!==projectId) throw Error("Progetto non corrispondente.");
const plan=await prepareSparkPlan(backup);
if(mode!=="--apply") {
 console.log(JSON.stringify({mode:"dry-run",documents:plan.count,writes:plan.items.length,issues:plan.issues.length,unmapped:plan.unmapped.length,images:plan.items.filter(i=>i.path.startsWith("diary/")&&i.data.image).length}));
 process.exit(0);
}
if(!projectId.startsWith("demo-")) {
 if(process.env.MIGRATION_CUTOVER_READY!==expectedHash) throw Error("Checkpoint di passaggio mancante.");
 const age=Date.now()-Date.parse(backup.exportedAt);
 if(!Number.isFinite(age)||age<0||age>3600000) throw Error("Backup troppo vecchio: massimo un'ora.");
}
const {db}=await operatorServices(projectId);
await mkdir("reports/private",{recursive:true});
const journal=await open("reports/private/spark-import-"+Date.now()+".jsonl","wx");
const record=async e=>{await journal.write(JSON.stringify({at:new Date().toISOString(),...e})+"\n");await journal.sync();};
try{
 await record({kind:"start",projectId,backupHash:expectedHash});
 const result=await importPlan({db,plan,record});
 await record({kind:"complete",...result});console.log(JSON.stringify(result));
}catch(e){await record({kind:"failed",message:e.message});throw e;}
finally{await journal.close();}

