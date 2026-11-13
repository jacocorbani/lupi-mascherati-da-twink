const {createRequire}=require('node:module');
const cli=createRequire(require.resolve('firebase-tools/package.json'));
const auth=cli('./lib/auth'); const {Client}=cli('./lib/apiv2');
(async()=>{ const account=auth.getGlobalDefaultAccount(); if(!account)throw Error('Login Firebase richiesto'); auth.setActiveAccount({},account); const r=await new Client({urlPrefix:'https://cloudbilling.googleapis.com'}).get('/v1/billingAccounts'); console.log(JSON.stringify({accounts:(r.body.billingAccounts||[]).map(a=>({name:a.name,displayName:a.displayName,open:a.open}))})); })().catch(e=>{console.error(e.message);process.exitCode=1;});
