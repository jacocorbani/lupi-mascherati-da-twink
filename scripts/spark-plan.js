import sharp from "sharp";
import {planMigration} from "./migration-plan.js";
export async function prepareSparkPlan(backup) {
 const plan=planMigration(backup);
 for(const item of plan.items) {
  if(!item.image) continue;
  let value="data:"+item.image.contentType+";base64,"+item.image.base64;
  if(value.length>300000) {
   const original=Buffer.from(item.image.base64,"base64");
   for(const width of [1200,900,675,500,350]) {
    const bytes=await sharp(original,{limitInputPixels:40000000}).rotate().resize({width,height:width,fit:"inside",withoutEnlargement:true}).jpeg({quality:72}).toBuffer();
    value="data:image/jpeg;base64,"+bytes.toString("base64");
    if(value.length<=300000) break;
   }
   if(value.length>300000) throw Error("Foto troppo grande per la migrazione Spark.");
  }
  item.data.image=value;
  delete item.image;
 }
 return plan;
}

