const {createRequire}=require("node:module");
const {mkdir,writeFile}=require("node:fs/promises");
const cli=createRequire(require.resolve("firebase-tools/package.json"));
const auth=cli("./lib/auth"),{Client}=cli("./lib/apiv2");
(async()=>{
 const account=auth.getGlobalDefaultAccount(); if(!account) throw Error("Login richiesto");
 auth.setActiveAccount({},account);
 const project="lupimacheratidatwink", path="/admin/v2/projects/"+project+"/config";
 const client=new Client({urlPrefix:"https://identitytoolkit.googleapis.com"});
 const headers={"X-Goog-User-Project":project};
 const previous=(await client.get(path,{headers})).body;
 await mkdir("reports/private",{recursive:true});
 await writeFile("reports/private/auth-config-before.local.json",JSON.stringify(previous,null,2),{flag:"wx"});
 const changes={
  authorizedDomains:[...new Set([...(previous.authorizedDomains||[]),"jacocorbani.github.io","localhost"])],
  client:{permissions:{disabledUserSignup:true,disabledUserDeletion:true}},
  emailPrivacyConfig:{enableImprovedEmailPrivacy:true},
  passwordPolicyConfig:{passwordPolicyEnforcementState:"ENFORCE",passwordPolicyVersions:[{customStrengthOptions:{minPasswordLength:12,maxPasswordLength:128}}]}
 };
 for(const [field,value] of Object.entries(changes)){
  try {await client.patch(path,{[field]:value},{headers,queryParams:{updateMask:field}}); console.log(field+": configurato");}
  catch(e){console.log(field+": "+e.message);}
 }
 const after=(await client.get(path,{headers})).body;
 await writeFile("reports/private/auth-config-after.local.json",JSON.stringify(after,null,2));
 console.log(JSON.stringify({email:after.signIn?.email,permissions:after.client?.permissions,policy:after.passwordPolicyConfig,domains:after.authorizedDomains}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});

