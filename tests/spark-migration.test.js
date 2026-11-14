import {test} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {randomBytes} from "node:crypto";
import sharp from "sharp";
import {prepareSparkPlan} from "../scripts/spark-plan.js";
import {importPlan} from "../functions/migration-engine.js";
test("migrazione Spark: compressione senza perdita dell'originale, ripresa e conflitti",async()=>{
 if(!process.env.FIRESTORE_EMULATOR_HOST) throw Error("Solo emulatori.");
 const req=createRequire(new URL("../functions/package.json",import.meta.url));
 const app=req("firebase-admin/app").initializeApp({projectId:"demo-combriccola"},"spark-migration");
 const db=req("firebase-admin/firestore").getFirestore(app);
 try {
  const image=await sharp(randomBytes(480*480*3),{raw:{width:480,height:480,channels:3}}).png().toBuffer();
  const original="data:image/png;base64,"+image.toString("base64");
  assert.ok(original.length>300000);
  const backup={groupId:"combriccola-principale",documents:[{path:"groups/combriccola-principale/diary/migration-spark",data:{text:"Fittizio",image:original,createdAt:{_seconds:1700000000,_nanoseconds:0}}}]};
  const plan=await prepareSparkPlan(backup);
  assert.equal(plan.items[0].data.legacy.image,original);
  assert.ok(plan.items[1].data.image.length<=300000);
  assert.equal(plan.items[1].data.authorUid,null);
  const log=[];
  await assert.rejects(importPlan({db,plan,record:async e=>{log.push(e);if(e.kind==="document-created")throw Error("Interruzione");}}),/Interruzione/);
  const result=await importPlan({db,plan,record:async e=>log.push(e)});
  assert.equal(result.verified,1); assert.equal(result.created,1);
  assert.equal((await importPlan({db,plan,record:async()=>{}})).created,0);
  await db.doc(plan.items[1].path).update({text:"Modificato"});
  await assert.rejects(importPlan({db,plan,record:async()=>{}}),/conflitto/);
 } finally {await req("firebase-admin/app").deleteApp(app);}
});

